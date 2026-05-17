import { supabase } from './lib/supabase';
async function run() {
  const { data } = await supabase.from('books').select('original_front_image_url, publish_front_image_url').not('original_front_image_url', 'is', null).limit(1);
  console.log(data);
}
run();
