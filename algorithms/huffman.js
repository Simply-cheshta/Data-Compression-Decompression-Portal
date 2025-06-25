const { resolveInclude } = require("ejs");

class Node {
    constructor(byte, freq, left = null, right = null) {
        this.byte = byte;
        this.freq = freq;
        this.left = left;
        this.right = right;
    }
}

function buildFrequencyMap(buffer) {
    const freqMap = new Map();
    for (const byte of buffer) {
        freqMap.set(byte, (freqMap.get(byte) || 0) + 1);
    }
    return freqMap;
}

function buildHuffmanTree(freqMap) {
    const nodes = [...freqMap.entries()].map(([byte, freq]) => new Node(byte, freq));
    while (nodes.length > 1) {
        nodes.sort((a, b) => a.freq - b.freq);
        const left = nodes.shift();
        const right = nodes.shift();
        nodes.push(new Node(null, left.freq + right.freq, left, right));
    }
    return nodes[0];
}

function generateCodes(node, prefix = '', codeMap = {}) {
    if (!node.left && !node.right) {
        codeMap[node.byte.toString()] = prefix;
        return;
    }
    generateCodes(node.left, prefix + '0', codeMap);
    generateCodes(node.right, prefix + '1', codeMap);
    return codeMap;
}

function serializeTree(node, result = []) {
    if (!node.left && !node.right) {
        result.push(1);
        result.push(node.byte);
    } else {
        result.push(0);
        serializeTree(node.left, result);
        serializeTree(node.right, result);
    }
    return result;
}

function deserializeTree(data, indexObj) {
    const bit = data[indexObj.i++];
    if (bit === 1) {
        const byte = data[indexObj.i++];
        return new Node(byte, 0);
    } else {
        const left = deserializeTree(data, indexObj);
        const right = deserializeTree(data, indexObj);
        return new Node(null, 0, left, right);
    }
}

function compressHuffman(buffer) {
    const freqMap = buildFrequencyMap(buffer);
    const tree = buildHuffmanTree(freqMap);
    const codeMap = generateCodes(tree);

    const bitString = [];
    for (const byte of buffer) {
        bitString.push(codeMap[byte.toString()]);
    }

    const fullBitString = bitString.join('');
    const padding = (8 - (fullBitString.length % 8)) % 8;
    const paddedBitString = fullBitString + '0'.repeat(padding);

    const byteArray = [];
    for (let i = 0; i < paddedBitString.length; i += 8) {
        byteArray.push(parseInt(paddedBitString.slice(i, i + 8), 2));
    }

    const treeData = serializeTree(tree);
    const header = Buffer.alloc(1 + treeData.length);
    header[0] = padding;
    for (let i = 0; i < treeData.length; i++) {
        header[i + 1] = treeData[i];
    }

    return Buffer.concat([header, Buffer.from(byteArray)]);
}

function decompressHuffman(buffer) {
    const padding = buffer[0];
    const treeData = [];

    let i = 1;
    while (i < buffer.length && treeData.length < buffer.length - 1) {
        treeData.push(buffer[i]);
        i++;
    }

    const indexObj = { i: 0 };
    const tree = deserializeTree(treeData, indexObj);

    const compressedStart = 1 + indexObj.i;
    const compressedBytes = buffer.slice(compressedStart);

    const bitString = [];
    for (const byte of compressedBytes) {
        bitString.push(byte.toString(2).padStart(8, '0'));
    }

    const fullBits = bitString.join('').slice(0, -padding);

    let node = tree;
    const output = [];

    for (const bit of fullBits) {
        node = bit === '0' ? node.left : node.right;
        if (!node.left && !node.right) {
            output.push(node.byte);
            node = tree;
        }
    }

    return Buffer.from(output);
}

module.exports = {
    compressHuffman,
    decompressHuffman
};
