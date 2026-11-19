const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'as',
  'into', 'about', 'over', 'after', 'before', 'between', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'please', 'request', 'ticket', 'issue',
]);

const extractKeywords = (text = '') => {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
};

export const scoreRelatedTicket = (source, candidate) => {
  let score = 0;
  const reasons = [];

  if (
    source.bookingReference &&
    candidate.bookingReference &&
    source.bookingReference.toLowerCase() === candidate.bookingReference.toLowerCase()
  ) {
    score += 50;
    reasons.push('bookingReference');
  }

  if (
    source.agency &&
    candidate.agency &&
    source.agency.toLowerCase() === candidate.agency.toLowerCase()
  ) {
    score += 20;
    reasons.push('agency');
  }

  if (source.category && source.category === candidate.category) {
    score += 10;
    reasons.push('category');
  }

  const sourceWords = new Set([
    ...extractKeywords(source.subject),
    ...extractKeywords(source.description),
  ]);
  const candidateWords = [
    ...extractKeywords(candidate.subject),
    ...extractKeywords(candidate.description),
  ];

  let keywordHits = 0;
  for (const word of candidateWords) {
    if (sourceWords.has(word)) keywordHits += 1;
  }
  const keywordScore = Math.min(keywordHits * 5, 20);
  if (keywordScore > 0) {
    score += keywordScore;
    reasons.push('keywords');
  }

  return { score, reasons };
};

export const findRelatedTickets = (sourceTicket, candidates, limit = 10) => {
  return candidates
    .map((c) => {
      const { score, reasons } = scoreRelatedTicket(sourceTicket, c);
      return {
        ticket: c,
        score,
        reasons,
        matchType: 'RULE_BASED',
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
