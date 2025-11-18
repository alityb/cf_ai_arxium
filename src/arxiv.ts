/**
 * ArXiv API integration for fetching research papers
 */

export interface ArXivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  published: string;
}

/**
 * List of famous ML/NLP researchers for better detection
 */
const FAMOUS_RESEARCHERS = [
  "Geoffrey Hinton", "Yann LeCun", "Yoshua Bengio", "Andrew Ng",
  "Fei-Fei Li", "Jürgen Schmidhuber", "Ian Goodfellow", "Demis Hassabis",
  "Jeff Dean", "Sam Altman", "Ilya Sutskever", "Dario Amodei",
  "Christopher Manning", "Richard Socher", "Sebastian Ruder", "Thomas Mikolov",
  "Quoc Le", "Oriol Vinyals", "Lukasz Kaiser", "Noam Shazeer",
  "Alec Radford", "Dario Amodei", "Tom Brown", "Ashish Vaswani",
  "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones",
  "Aidan Gomez", "Lukasz Kaiser", "Illia Polosukhin", "Kaiming He",
  "Ross Girshick", "Jitendra Malik", "Trevor Darrell", "Sergey Levine",
  "Pieter Abbeel", "Chelsea Finn", "Timnit Gebru", "Joy Buolamwini",
].map(name => name.toLowerCase());

/**
 * Detect if query is asking about a specific author
 */
function detectAuthorQuery(query: string): { isAuthorQuery: boolean; authorName?: string } {
  const queryLower = query.toLowerCase();
  
  // Check for explicit author search patterns
  const authorPatterns = [
    /(?:papers?\s+by|work\s+by|research\s+by|authored\s+by|publications\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+from|\s+at|\s+@|\s+recent|\s+work)/i, // "John Smith from CMU" or "John Smith recent"
    /^([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+from|\s+at)?$/i, // Just a name
  ];

  for (const pattern of authorPatterns) {
    const match = query.match(pattern);
    if (match) {
      const name = match[1].trim();
      return { isAuthorQuery: true, authorName: name };
    }
  }

  // Check if query contains a famous researcher name
  for (const researcherLower of FAMOUS_RESEARCHERS) {
    if (queryLower.includes(researcherLower)) {
      // Find the original capitalization in the query
      const nameParts = researcherLower.split(' ');
      const namePattern = new RegExp(
        `(${nameParts.map(part => `[A-Z][a-z]*${part.slice(1)}`).join('\\s+')})`,
        'i'
      );
      const nameMatch = query.match(namePattern);
      if (nameMatch) {
        // Use the matched name as-is (preserves original capitalization)
        const matchedName = nameMatch[1];
        // Capitalize properly if needed
        const capitalized = matchedName.split(' ').map(n => {
          const first = n.charAt(0).toUpperCase();
          const rest = n.slice(1).toLowerCase();
          return first + rest;
        }).join(' ');
        return { isAuthorQuery: true, authorName: capitalized };
      }
    }
  }

  // Check if query looks like a name (two capitalized words, short query)
  const namePattern = /^([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+.*)?$/;
  const nameMatch = query.match(namePattern);
  if (nameMatch && query.split(/\s+/).length <= 6) {
    // Likely a name if it's short and has two capitalized words
    // But avoid common ML terms that might match
    const commonTerms = ['machine learning', 'deep learning', 'neural network', 'transformer', 'attention'];
    const queryLowerCheck = queryLower;
    const isCommonTerm = commonTerms.some(term => queryLowerCheck.includes(term));
    
    if (!isCommonTerm) {
      return { isAuthorQuery: true, authorName: nameMatch[1].trim() };
    }
  }

  return { isAuthorQuery: false };
}

/**
 * Search ArXiv for papers matching a query
 */
export async function searchArXiv(query: string, maxResults: number = 10): Promise<ArXivPaper[]> {
  const { isAuthorQuery, authorName } = detectAuthorQuery(query);
  
  let searchQuery: string;
  if (isAuthorQuery && authorName) {
    // Use author search: au:"Author Name"
    searchQuery = `au:"${authorName}"`;
    console.log(`Detected author query, searching for: ${authorName}`);
  } else {
    // Use general search but be more specific
    // Remove common words and focus on key terms
    const cleanedQuery = query
      .replace(/\b(what|is|are|the|a|an|how|does|do|can|could|would|should|about|from|at|by|with)\b/gi, "")
      .trim();
    searchQuery = cleanedQuery || query;
  }

  const encodedQuery = encodeURIComponent(searchQuery);
  const url = `https://export.arxiv.org/api/query?search_query=${encodedQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "arxium/1.0",
      },
    });
    
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    let papers = parseArXivXML(xmlText);
    
    // If author query, filter to only papers where author actually matches
    if (isAuthorQuery && authorName) {
      const authorLower = authorName.toLowerCase();
      papers = papers.filter((paper) => {
        return paper.authors.some((author) =>
          author.toLowerCase().includes(authorLower) ||
          authorLower.includes(author.toLowerCase().split(" ").pop() || "")
        );
      });
      console.log(`Filtered to ${papers.length} papers by ${authorName}`);
    }
    
    if (papers.length === 0) {
      console.warn("No papers found in ArXiv response");
    }
    
    return papers.slice(0, maxResults);
  } catch (error) {
    console.error("Error fetching from ArXiv:", error);
    throw error;
  }
}

/**
 * Parse ArXiv XML response
 */
function parseArXivXML(xmlText: string): ArXivPaper[] {
  const papers: ArXivPaper[] = [];
  
  // Simple XML parsing (for production, consider using a proper XML parser)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1];
    
    // Extract ID
    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const id = idMatch ? idMatch[1].replace("http://arxiv.org/abs/", "") : "";

    // Extract title
    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

    // Extract authors
    const authors: string[] = [];
    const authorRegex = /<name>(.*?)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    // Extract abstract
    const abstractMatch = entry.match(/<summary>(.*?)<\/summary>/);
    const abstract = abstractMatch ? abstractMatch[1].replace(/\s+/g, " ").trim() : "";

    // Extract published date
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    const published = publishedMatch ? publishedMatch[1] : "";

    // Construct URL
    const url = `https://arxiv.org/abs/${id}`;

    if (id && title && abstract) {
      papers.push({
        id,
        title,
        authors,
        abstract,
        url,
        published,
      });
    }
  }

  return papers;
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(text: string, chunkSize: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  
  return chunks;
}

