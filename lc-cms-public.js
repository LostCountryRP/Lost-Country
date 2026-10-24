/* Lost Country RP - Applicazione sicura dei testi pubblicati dall'amministrazione */
(() => {
  'use strict';
  async function apply() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const containers = [...document.querySelectorAll('[data-lc-edit]')];
    if (!containers.length || !window.LC_CMS || !window.supabase ||
      !window.LC_SUPABASE_URL || !window.LC_SUPABASE_KEY) return;
    try {
      const db = window.supabase.createClient(window.LC_SUPABASE_URL, window.LC_SUPABASE_KEY, {
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
      });
      const {data,error} = await db.from('lc_site_edits')
        .select('block_key,html').eq('page',page).eq('enabled',true);
      if (error) throw error;
      const targetMap = new Map(containers.map(element=>[element.dataset.lcEdit,element]));
      for (const row of data || []) {
        const element = targetMap.get(row.block_key);
        if (!element) continue;
        const safe = window.LC_CMS.sanitize(row.html);
        if (safe.trim()) element.innerHTML = safe;
      }
    } catch (err) {
      // Le pagine statiche originali continuano a funzionare anche se Supabase non risponde.
      console.warn('Contenuti originali mantenuti:',err.message);
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();