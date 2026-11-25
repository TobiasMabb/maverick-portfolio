/* =====================================================================
   DATABASE CONNECTION
   Both values are in Supabase: Project Settings > API Keys (and the "Connect" button).

   supabaseUrl      looks like  https://abcdefghijklmnop.supabase.co
   supabaseAnonKey  the PUBLISHABLE key (starts with sb_publishable_) or the older
                    "anon" key. Both are safe to put here because the database rules
                    only let visitors read. NEVER paste a "secret" or "service_role" key.

   While either value is empty, the site simply shows the content in data.js.
   ===================================================================== */
window.PORTFOLIO_CONFIG = {
  supabaseUrl: 'https://bneqkfdlnspvdtucaozq.supabase.co',
  supabaseAnonKey: 'sb_publishable_7HrCWTBXp5gFxUiFHQAR_A_oN27PvZG',

  /* Your photo for the big circle, used only when no photo has been uploaded in the admin page.
     Put the picture in the images folder and write its path, for example 'images/portrait.jpg'. */
  portrait: ''
};