/**
 * Chat Analysis Configuration Constants
 * 
 * This file contains all the thresholds and configuration values for the
 * conversational AI system that builds rich interest profiles through
 * natural conversation.
 */

// Chat Analysis Configuration Constants
export const CHAT_ANALYSIS_CONFIG = {
    // Interest thresholds
    MIN_CONFIDENCE_THRESHOLD: 0.3,        // Minimum confidence required to consider an interest valid
    HIGH_SPECIFICITY_THRESHOLD: 0.7,      // Threshold for considering an interest "specific" (vs broad)
    HIGH_CONFIDENCE_THRESHOLD: 0.8,       // Threshold for high-confidence interests that trigger acknowledgments

    // Sufficient information criteria for recommendations
    MIN_KEYWORDS_FOR_RECOMMENDATIONS: 5,  // Minimum number of interests needed before recommending events
    MIN_HIGH_SPECIFICITY_KEYWORDS: 1,     // At least one interest must be specific (not just broad categories)

    // Keyword merging
    MERGE_CONFIDENCE_BOOST: 0.33,         // When merging similar keywords, add 1/3 of the lower confidence score

    // Update thresholds
    STRONG_UPDATE_SPECIFICITY_THRESHOLD: 0.7,  // Specificity threshold for "strong" updates
    STRONG_UPDATE_CONFIDENCE_THRESHOLD: 0.8,   // Confidence threshold for "strong" updates
}; 