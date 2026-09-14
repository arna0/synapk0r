import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class ThreeDViewport extends StatefulWidget {
  const ThreeDViewport({super.key});

  @override
  State<ThreeDViewport> createState() => _ThreeDViewportState();
}

class _ThreeDViewportState extends State<ThreeDViewport>
    with SingleTickerProviderStateMixin {
  late final WebViewController _webViewController;
  bool _isLoading = true;
  bool _hasError = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initWebView();
  }

  void _initWebView() {
    try {
      _webViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(AppTheme.bgDark)
        ..addJavaScriptChannel(
          'GameChannel',
          onMessageReceived: (JavaScriptMessage message) {
            if (!mounted) return;
            debugPrint('[ThreeDViewport] JS Message Received: ${message.message}');
            context.read<GameProvider>().onIngredientSelected(message.message);
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (String url) {
              if (mounted) {
                setState(() {
                  _isLoading = false;
                });
              }
            },
            onWebResourceError: (WebResourceError error) {
              debugPrint('[ThreeDViewport] WebView Error: ${error.description}');
              if (mounted) {
                setState(() {
                  _isLoading = false;
                  // Don't block UI on webview error, fallback will still work
                });
              }
            },
          ),
        )
        ..loadHtmlString(_buildThreeJsHtml());
    } catch (e) {
      debugPrint('[ThreeDViewport] Exception initializing WebView: $e');
      setState(() {
        _isLoading = false;
        _hasError = true;
      });
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameProvider>();

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgDark,
        border: Border(
          bottom: BorderSide(
            color: game.lastActionWasError
                ? AppTheme.neonRed
                : AppTheme.accentPurple.withOpacity(0.5),
            width: 2,
          ),
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Three.js Interactive WebGL Scene
          if (!_hasError)
            WebViewWidget(controller: _webViewController)
          else
            _buildInteractive3DFallback(game),

          // 2. Loading State Overlay with SpinKitCubeGrid
          if (_isLoading)
            Container(
              color: AppTheme.bgDark,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SpinKitCubeGrid(
                      color: AppTheme.neonCyan,
                      size: 56.0,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'ЗАГРУЗКА 3D СЦЕНЫ WebGL...',
                      style: GoogleFonts.orbitron(
                        color: AppTheme.neonCyan,
                        fontSize: 12,
                        letterSpacing: 2,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Three.js Barista Workspace',
                      style: GoogleFonts.plusJakartaSans(
                        color: AppTheme.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // 3. Top Cyberpunk HUD Header (Status & Target Ingredient)
          Positioned(
            top: 12,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Live 3D Badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.65),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.neonCyan.withOpacity(0.7),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppTheme.neonCyan,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '3D VIEWPORT • INTERACTIVE',
                        style: GoogleFonts.orbitron(
                          color: AppTheme.neonCyan,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),

                // Error Counter
                if (game.quest1Errors > 0)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppTheme.neonRed.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.neonRed, width: 1.2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.warning_amber_rounded,
                            color: AppTheme.neonRed, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          'Ошибки: ${game.quest1Errors}',
                          style: GoogleFonts.orbitron(
                            color: AppTheme.neonRed,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // 4. Feedback Flash Banner
          if (game.lastActionFeedback != null &&
              game.stage == GameStage.quest1Cooking)
            Positioned(
              bottom: 64,
              left: 20,
              right: 20,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 300),
                opacity: 1.0,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: game.lastActionWasError
                        ? AppTheme.neonRed.withOpacity(0.85)
                        : AppTheme.accentPurple.withOpacity(0.85),
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: (game.lastActionWasError
                                ? AppTheme.neonRed
                                : AppTheme.accentPurple)
                            .withOpacity(0.4),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: Text(
                    game.lastActionFeedback!,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),

          // 5. Quick Touch Action Bar at the bottom of 3D Scene
          if (game.stage == GameStage.quest1Cooking)
            Positioned(
              bottom: 8,
              left: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.75),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: AppTheme.cardBorder.withOpacity(0.8), width: 1),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _build3DQuickBtn(
                      title: 'Espresso',
                      icon: Icons.coffee_rounded,
                      color: const Color(0xFFE17055),
                      isTarget: game.currentExpectedIngredient == 'Espresso',
                      onTap: () => game.onIngredientSelected('Espresso'),
                    ),
                    _build3DQuickBtn(
                      title: 'Oat Milk',
                      icon: Icons.water_drop_rounded,
                      color: const Color(0xFF00CEC9),
                      isTarget: game.currentExpectedIngredient == 'Oat Milk',
                      onTap: () => game.onIngredientSelected('Oat Milk'),
                    ),
                    _build3DQuickBtn(
                      title: 'Syrup',
                      icon: Icons.science_rounded,
                      color: const Color(0xFFFDCB6E),
                      isTarget: game.currentExpectedIngredient == 'Syrup',
                      onTap: () => game.onIngredientSelected('Syrup'),
                    ),
                    _build3DQuickBtn(
                      title: 'Ice',
                      icon: Icons.ac_unit_rounded,
                      color: const Color(0xFF74B9FF),
                      isTarget: game.currentExpectedIngredient == 'Ice',
                      onTap: () => game.onIngredientSelected('Ice'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _build3DQuickBtn({
    required String title,
    required IconData icon,
    required Color color,
    required bool isTarget,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isTarget ? color.withOpacity(0.3) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isTarget ? color : Colors.white24,
            width: isTarget ? 1.8 : 1.0,
          ),
          boxShadow: isTarget
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.4),
                    blurRadius: 8,
                    spreadRadius: 1,
                  )
                ]
              : [],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: isTarget ? color : Colors.white70, size: 18),
            const SizedBox(height: 2),
            Text(
              title,
              style: GoogleFonts.orbitron(
                color: isTarget ? Colors.white : Colors.white60,
                fontSize: 9,
                fontWeight: isTarget ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// High-fidelity Native 3D Canvas Fallback in case WebGL is disabled or on desktop/test runners
  Widget _buildInteractive3DFallback(GameProvider game) {
    return Container(
      color: const Color(0xFF0D0D1A),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ScaleTransition(
              scale: _pulseAnimation,
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.accentPurple.withOpacity(0.4),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: const Icon(
                  Icons.coffee_maker_rounded,
                  size: 72,
                  color: AppTheme.neonCyan,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '3D BARISTA WORKSPACE',
              style: GoogleFonts.orbitron(
                color: AppTheme.neonCyan,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Нажмите на нужный ингредиент ниже для добавления',
              style: GoogleFonts.plusJakartaSans(
                color: AppTheme.textSecondary,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Interactive HTML5 + Three.js 3D Coffee Station WebGL application
  String _buildThreeJsHtml() {
    return '''
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>JobSim 3D Barista</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: radial-gradient(circle at center, #1A1A35 0%, #0F0F1E 100%);
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }
    #canvas3d { width: 100vw; height: 100vh; display: block; }
    #tooltip {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 15, 30, 0.85);
      border: 1px solid #6C5CE7;
      color: #00FFB3;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      pointer-events: none;
      box-shadow: 0 0 15px rgba(108, 92, 231, 0.4);
      transition: opacity 0.3s;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <div id="tooltip">3D ОБЪЕКТЫ КЛИКАБЕЛЬНЫ • THREE.JS</div>
  <div id="canvas3d"></div>

  <script>
    // ----------------------------------------------------
    // Three.js Scene Setup
    // ----------------------------------------------------
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0F0F1E, 0.05);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 3.2, 7.2);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('canvas3d').appendChild(renderer.domElement);

    // ----------------------------------------------------
    // Lighting (Cyberpunk Neon Ambient & Spotlight)
    // ----------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0x3B3B5C, 1.8);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00FFB3, 3, 15);
    cyanPointLight.position.set(-3, 3, 2);
    scene.add(cyanPointLight);

    const purplePointLight = new THREE.PointLight(0x6C5CE7, 4, 15);
    purplePointLight.position.set(3, 3, 2);
    scene.add(purplePointLight);

    const topLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    topLight.position.set(0, 8, 4);
    scene.add(topLight);

    // ----------------------------------------------------
    // Bar Counter Table Mesh
    // ----------------------------------------------------
    const tableGeo = new THREE.BoxGeometry(8, 0.4, 4);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x16162A,
      metalness: 0.8,
      roughness: 0.2,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, -0.2, 0);
    scene.add(table);

    // Grid Wireframe on Table
    const gridHelper = new THREE.GridHelper(8, 16, 0x6C5CE7, 0x2E2E54);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Interactive Objects Registry
    const interactables = [];

    // Helper: Material Creator
    function createCyberMaterial(colorHex, emissiveHex, emissiveIntensity = 0.2) {
      return new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: emissiveHex,
        emissiveIntensity: emissiveIntensity,
        metalness: 0.6,
        roughness: 0.3,
      });
    }

    // ----------------------------------------------------
    // 1. COFFEE MACHINE (ESPRESSO) - Left
    // ----------------------------------------------------
    const coffeeGroup = new THREE.Group();
    coffeeGroup.name = "Espresso";

    // Main Body
    const bodyGeo = new THREE.BoxGeometry(1.6, 2.0, 1.4);
    const bodyMat = createCyberMaterial(0x2D3436, 0x6C5CE7, 0.15);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    coffeeGroup.add(body);

    // Chrome Top & Group Head
    const headGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16);
    const chromeMat = createCyberMaterial(0xDFE6E9, 0x00FFB3, 0.3);
    const head = new THREE.Mesh(headGeo, chromeMat);
    head.position.set(0, 0.8, 0.7);
    coffeeGroup.add(head);

    // Portafilter Handle
    const handleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
    const handleMat = createCyberMaterial(0x1E272E, 0x000000, 0);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0.7, 1.0);
    coffeeGroup.add(handle);

    // Neon Glow Line
    const glowGeo = new THREE.BoxGeometry(1.4, 0.06, 0.06);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00FFB3 });
    const glowLine = new THREE.Mesh(glowGeo, glowMat);
    glowLine.position.set(0, 1.8, 0.71);
    coffeeGroup.add(glowLine);

    coffeeGroup.position.set(-2.2, 0, 0);
    scene.add(coffeeGroup);
    interactables.push(coffeeGroup);

    // ----------------------------------------------------
    // 2. GLASS CUP & ICE / SYRUP - Center
    // ----------------------------------------------------
    const cupGroup = new THREE.Group();
    cupGroup.name = "Ice";

    // Glass Cylinder
    const cupGeo = new THREE.CylinderGeometry(0.55, 0.4, 1.3, 24);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x74B9FF,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
      metalness: 0.1,
    });
    const cup = new THREE.Mesh(cupGeo, glassMat);
    cup.position.y = 0.65;
    cupGroup.add(cup);

    // Coffee Liquid Inside
    const liquidGeo = new THREE.CylinderGeometry(0.5, 0.36, 0.7, 24);
    const liquidMat = createCyberMaterial(0x6F4E37, 0xD63031, 0.2);
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = 0.45;
    cupGroup.add(liquid);

    // Ice Cubes inside
    for (let i = 0; i < 3; i++) {
      const iceGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const iceMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
      });
      const iceMesh = new THREE.Mesh(iceGeo, iceMat);
      iceMesh.position.set((i - 1) * 0.15, 0.65 + i * 0.1, (i % 2 === 0 ? 0.08 : -0.08));
      iceMesh.rotation.set(0.4 * i, 0.5 * i, 0.2 * i);
      cupGroup.add(iceMesh);
    }

    cupGroup.position.set(0, 0, 0.3);
    scene.add(cupGroup);
    interactables.push(cupGroup);

    // ----------------------------------------------------
    // 3. MILK PITCHER (OAT MILK) - Right
    // ----------------------------------------------------
    const pitcherGroup = new THREE.Group();
    pitcherGroup.name = "Oat Milk";

    // Stainless Steel Pitcher Body
    const pitcherGeo = new THREE.CylinderGeometry(0.45, 0.55, 1.2, 24);
    const pitcherMat = createCyberMaterial(0xB2BEC3, 0x6C5CE7, 0.25);
    const pitcher = new THREE.Mesh(pitcherGeo, pitcherMat);
    pitcher.position.y = 0.6;
    pitcherGroup.add(pitcher);

    // Pitcher Handle
    const pHandleGeo = new THREE.TorusGeometry(0.3, 0.06, 8, 16, Math.PI);
    const pHandle = new THREE.Mesh(pHandleGeo, pitcherMat);
    pHandle.position.set(0.5, 0.6, 0);
    pHandle.rotation.z = -Math.PI / 2;
    pitcherGroup.add(pHandle);

    // Oat Milk Tag Badge
    const tagGeo = new THREE.BoxGeometry(0.4, 0.2, 0.05);
    const tagMat = new THREE.MeshBasicMaterial({ color: 0xFDCB6E });
    const tag = new THREE.Mesh(tagGeo, tagMat);
    tag.position.set(0, 0.6, 0.56);
    pitcherGroup.add(tag);

    pitcherGroup.position.set(2.2, 0, 0);
    scene.add(pitcherGroup);
    interactables.push(pitcherGroup);

    // ----------------------------------------------------
    // 4. FLOATING PARTICLES / STEAM
    // ----------------------------------------------------
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 5;
      particlePositions[i + 1] = Math.random() * 3 + 0.5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x00FFB3,
      size: 0.06,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // ----------------------------------------------------
    // Raycasting & Touch Interaction
    // ----------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerDown(event) {
      const clientX = event.clientX || (event.touches && event.touches[0].clientX);
      const clientY = event.clientY || (event.touches && event.touches[0].clientY);
      if (clientX === undefined || clientY === undefined) return;

      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Collect all mesh children
      const checkObjects = [];
      interactables.forEach(g => {
        g.traverse(child => {
          if (child.isMesh) {
            child.userData.parentGroupName = g.name;
            checkObjects.push(child);
          }
        });
      });

      const intersects = raycaster.intersectObjects(checkObjects);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const groupName = hit.object.userData.parentGroupName || hit.object.name;

        // Visual click reaction: bounce animation
        const matchedGroup = interactables.find(g => g.name === groupName);
        if (matchedGroup) {
          matchedGroup.position.y = 0.35;
          setTimeout(() => { matchedGroup.position.y = 0; }, 180);
        }

        // Post back to Flutter
        if (window.GameChannel && window.GameChannel.postMessage) {
          window.GameChannel.postMessage(groupName);
        }
      }
    }

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ----------------------------------------------------
    // Animation Render Loop
    // ----------------------------------------------------
    let clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Subtle float oscillation
      coffeeGroup.position.y = Math.sin(time * 1.5) * 0.04;
      pitcherGroup.position.y = Math.sin(time * 1.5 + 1.2) * 0.04;
      cupGroup.rotation.y = time * 0.3;

      // Particle floating animation
      const positions = particleGeo.attributes.position.array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += 0.008;
        if (positions[i] > 4) positions[i] = 0.5;
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>
''';
  }
}
