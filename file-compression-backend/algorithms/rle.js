function compressRLE(buffer){
    if (!Buffer.isBuffer(buffer)){
        throw new Error('Input should be buffer');
    }

    const compressed=[];
    let prevByte=buffer[0];
    let count=1;
    for (let i=1;i<buffer.length;i++){
        const currentByte=buffer[i];
        if (currentByte===prevByte && count<255){
            count++;
        }else{
            compressed.push(prevByte,count);
            prevByte=currentByte;
            count=1;
        }
    }
    compressed.push(prevByte,count);
    return Buffer.from(compressed);
}

function decompressRLE(buffer){
    if (!Buffer.isBuffer(buffer)){
        throw new Error('Input should be a buffer');
    }

    const decompressed=[];

    for (let i=0;i<buffer.length;i+=2){
        const byte=buffer[i];
        const count=buffer[i+1];
        for (let j=0;j<count;j++){
            decompressed.push(byte);
        }
    }
    
    return Buffer.from(decompressed);
}

module.exports={compressRLE,decompressRLE};