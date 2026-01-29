import { tokenize } from "../utils/tokenizer";
const globalFrequency = new Map();
export function analyzePage(text) {
    const tokens = tokenize(text);
    for (const word of tokens) {
        globalFrequency.set(word, (globalFrequency.get(word) || 0) + 1);
    }
}
export function getTopWords(topN) {
    return [...globalFrequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word, count]) => ({ word, count }));
}
export function resetFrequency() {
    globalFrequency.clear();
}
class MinHeap {
    constructor() {
        this.data = [];
    }
    compare(a, b) {
        // Min-heap by count
        return a[1] - b[1];
    }
    size() {
        return this.data.length;
    }
    peek() {
        return this.data[0];
    }
    push(item) {
        this.data.push(item);
        this.bubbleUp(this.data.length - 1);
    }
    pop() {
        const n = this.data.length;
        if (n === 0)
            return undefined;
        const top = this.data[0];
        const last = this.data.pop();
        if (n > 1) {
            this.data[0] = last;
            this.bubbleDown(0);
        }
        return top;
    }
    toArray() {
        return this.data.slice();
    }
    bubbleUp(index) {
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (this.compare(this.data[index], this.data[parent]) < 0) {
                [this.data[index], this.data[parent]] = [
                    this.data[parent],
                    this.data[index],
                ];
                index = parent;
            }
            else {
                break;
            }
        }
    }
    bubbleDown(index) {
        const n = this.data.length;
        while (true) {
            let smallest = index;
            const left = (index << 1) + 1;
            const right = left + 1;
            if (left < n && this.compare(this.data[left], this.data[smallest]) < 0) {
                smallest = left;
            }
            if (right < n &&
                this.compare(this.data[right], this.data[smallest]) < 0) {
                smallest = right;
            }
            if (smallest !== index) {
                [this.data[index], this.data[smallest]] = [
                    this.data[smallest],
                    this.data[index],
                ];
                index = smallest;
            }
            else {
                break;
            }
        }
    }
}
export function getTopWordsHeap(topN) {
    if (topN <= 0)
        return [];
    const heap = new MinHeap();
    for (const entry of globalFrequency.entries()) {
        heap.push(entry);
        if (heap.size() > topN) {
            heap.pop();
        }
    }
    return heap
        .toArray()
        .sort((a, b) => b[1] - a[1])
        .map(([word, count]) => ({ word, count }));
}
