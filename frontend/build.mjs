import {build} from 'esbuild';
import {cp, mkdir} from 'node:fs/promises';
await mkdir('../static/whiteboard',{recursive:true});
await build({entryPoints:['editor.jsx'],bundle:true,minify:true,format:'esm',splitting:true,conditions:['production'],outdir:'../static/whiteboard',define:{'process.env.NODE_ENV':'"production"'},loader:{'.woff2':'file','.woff':'file'}});
await cp('node_modules/@excalidraw/excalidraw/dist/prod/fonts','../static/whiteboard/fonts',{recursive:true});
