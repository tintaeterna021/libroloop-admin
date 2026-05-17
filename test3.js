const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: books, error } = await supabase.from('books').select('publish_back_image_url').not('publish_back_image_url', 'is', null).limit(3);
  console.log("Books:", books);

  if (books && books.length > 0) {
     const url = books[0].publish_back_image_url;
     console.log("URL to test:", url);
     
     const parts = url.split('/public/books/');
     let path = parts.length > 1 ? parts[1] : null;
     if (path) {
         path = path.split('?')[0];
         path = path.split('#')[0];
         try {
             path = decodeURIComponent(path);
         } catch(e) {}
     }
     console.log("Extracted path:", path);
     
     // Let's also list files in that user's folder
     if (path) {
        const folder = path.split('/')[0];
        console.log("Folder:", folder);
        const { data: files, error: listError } = await supabase.storage.from('books').list(folder);
        console.log("Files in folder:", files);
        console.log("List error:", listError);
     }
  }
}
run();
