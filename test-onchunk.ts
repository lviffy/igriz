import { streamText } from 'ai';
const options = {
  onChunk: (chunk: any) => { console.log(chunk); }
};
console.log(Object.keys(options));
