// Curated interest topics for onboarding + discovery.
// Each topic maps to a search query run against the upstream source.
export const TOPICS = [
    { id: 'fiction', label: 'Fiction', emoji: '📖', query: 'fiction bestseller' },
    { id: 'fantasy', label: 'Fantasy', emoji: '🐉', query: 'fantasy' },
    { id: 'scifi', label: 'Sci-Fi', emoji: '🚀', query: 'science fiction' },
    { id: 'romance', label: 'Romance', emoji: '💛', query: 'romance novel' },
    { id: 'mystery', label: 'Mystery', emoji: '🔍', query: 'mystery thriller' },
    { id: 'history', label: 'History', emoji: '🏛️', query: 'history' },
    { id: 'science', label: 'Science', emoji: '🔬', query: 'science' },
    { id: 'programming', label: 'Programming', emoji: '💻', query: 'programming' },
    { id: 'technology', label: 'Technology', emoji: '⚙️', query: 'technology' },
    { id: 'business', label: 'Business', emoji: '💼', query: 'business' },
    { id: 'selfhelp', label: 'Self-Help', emoji: '🌱', query: 'self improvement' },
    { id: 'psychology', label: 'Psychology', emoji: '🧠', query: 'psychology' },
    { id: 'philosophy', label: 'Philosophy', emoji: '🤔', query: 'philosophy' },
    { id: 'biography', label: 'Biography', emoji: '👤', query: 'biography' },
    { id: 'health', label: 'Health', emoji: '🩺', query: 'health fitness' },
    { id: 'cooking', label: 'Cooking', emoji: '🍳', query: 'cookbook recipes' },
    { id: 'travel', label: 'Travel', emoji: '✈️', query: 'travel guide' },
    { id: 'art', label: 'Art', emoji: '🎨', query: 'art design' },
    { id: 'poetry', label: 'Poetry', emoji: '🪶', query: 'poetry' },
    { id: 'children', label: 'Children', emoji: '🧸', query: 'children books' },
];

// Curated "trending" — popular/evergreen queries (not real analytics).
export const TRENDING_QUERIES = [
    'bestseller 2024',
    'new york times bestseller',
    'award winning novel',
    'classic literature',
];

const topicById = new Map(TOPICS.map((t) => [t.id, t]));

// Resolve topic ids to their search queries, skipping unknowns.
export function resolveTopicQueries(ids = []) {
    return ids
        .map((id) => topicById.get(String(id).trim().toLowerCase()))
        .filter(Boolean)
        .map((t) => t.query);
}
