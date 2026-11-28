// Tokens are bearer capabilities. Store only their SHA-256 digest on the server.
export const validDeleteToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export async function hashSecret(value) {
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function equalHash(a,b) {
 let mismatch=a.length ^ b.length;
 for(let i=0;i<64;i++) mismatch |= (a.charCodeAt(i)||0) ^ (b.charCodeAt(i)||0);
 return mismatch===0;
}
export async function canDeleteReview(row,token,authorization,adminSecret) {
 const suppliedAdmin=authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
 const admin=adminSecret ? equalHash(await hashSecret(suppliedAdmin),await hashSecret(adminSecret)) : false;
 const suppliedHash=await hashSecret(validDeleteToken(token)?token:'');
 const owner=validDeleteToken(token) && !!row?.delete_token_hash && equalHash(suppliedHash,row.delete_token_hash);
 // An absent row is a successful no-op for a device capability (offline queue or lost DELETE response).
 return admin || owner || (!row && validDeleteToken(token));
}
