import {build} from 'esbuild';
import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/assets',{recursive:true});
await build({entryPoints:['src/main.tsx'],bundle:true,minify:true,outfile:'dist/assets/app.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
for(const file of ['index.html','config.js','.nojekyll'])await copyFile('public/'+file,'dist/'+file);
