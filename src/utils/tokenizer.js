import { STOP_WORDS } from "./stopwords";
export function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}
