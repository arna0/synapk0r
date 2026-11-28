(() => {
 let adminToken = '', page = 1, snapshot = null;
 const status = document.getElementById('moderationStatus'), list = document.getElementById('moderationReviews'), more = document.getElementById('moderationMore');
 function base() { const value=getApiBase(); if(value===null) throw new Error('Configure a backend URL before moderating.'); return value; }
 async function remove(id) {
  if(!adminToken) { status.textContent='Enter the owner moderation secret first.'; return; }
  if(!confirm('Permanently delete feedback '+id+' and remove it from public totals? This cannot be undone.')) return;
  status.textContent='Deleting…';
  try {
   const response=await fetch(base()+'/api/reviews/'+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:'Bearer '+adminToken},signal:AbortSignal.timeout(8000)});
   if(!response.ok) throw new Error(response.status===401?'The secret was not accepted.':'Deletion failed ('+response.status+'). Retry when connected.');
   const result=await response.json(); if(result.ok!==true) throw new Error('Server deletion was not confirmed.');
   await load(true); status.textContent=result.deleted?'Feedback deleted.':'No feedback with that ID remains.';
  } catch(error) { status.textContent=error.message; }
 }
 async function load(reset=false) {
  more.disabled=true; status.textContent='Loading public feedback…';
  if(reset){page=1;snapshot=null;list.replaceChildren();}
  try {
   const query=new URLSearchParams({page:String(page)}); if(snapshot!==null) query.set('snapshot',snapshot);
   const response=await fetch(base()+'/api/reviews?'+query,{signal:AbortSignal.timeout(8000)}); if(!response.ok) throw new Error('Could not load feedback ('+response.status+').');
   const data=await response.json(); snapshot=data.snapshot??null;
   for(const row of data.reviews) {
    const article=document.createElement('article'), title=document.createElement('h2'), details=document.createElement('p'), comment=document.createElement('p'), answers=document.createElement('pre'), button=document.createElement('button');
    title.textContent=row.module; details.textContent=row.at+' · '+row.id; comment.textContent=row.comment||'(No comment)'; answers.textContent=JSON.stringify(row.answers,null,2);
    button.type='button';button.textContent='Delete this feedback…';button.onclick=()=>remove(row.id);article.append(title,details,comment,answers,button);list.append(article);
   }
   page++; more.hidden=!data.hasMore; status.textContent=data.total+' public response(s).';
  } catch(error){status.textContent=error.message;} finally {more.disabled=false;}
 }
 document.getElementById('moderationAccess').onsubmit=event=>{event.preventDefault();const input=document.getElementById('moderationSecret');adminToken=input.value;input.value='';status.textContent='Secret held in memory for this page session.';};
 document.getElementById('moderationLock').onclick=()=>{adminToken='';document.getElementById('moderationSecret').value='';status.textContent='Secret cleared.';};
 document.getElementById('moderationById').onsubmit=event=>{event.preventDefault();remove(document.getElementById('moderationId').value.trim());};
 document.getElementById('moderationRefresh').onclick=()=>load(true); more.onclick=()=>load();
 window.addEventListener('pagehide',()=>{adminToken='';}); load(true);
})();
