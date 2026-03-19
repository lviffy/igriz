import { createDataStream } from 'ai';

const stream = createDataStream({
  async execute(dataStream) {
    dataStream.writeData({ test: 1 });
  }
});

const reader = stream.getReader();
reader.read().then(res => {
  console.log('Type of chunk:', typeof res.value);
  console.log('Value constructor:', res.value?.constructor?.name);
  console.log('Value:', res.value);
});
