const RESUME_MAX_CHARS = 7200;   // ~1800 tokens
const JD_MAX_CHARS = 3200;       // ~800 tokens

export interface TrimResult {
  text: string;
  wasTrimmed: boolean;
}

export function trimResume(text: string): TrimResult {
  if (text.length <= RESUME_MAX_CHARS) {
    return { text, wasTrimmed: false };
  }

  // Try to keep the first 3 role blocks intact
  // Split by common resume separators
  const lines = text.split('\n');
  let roleCount = 0;
  let cutIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Detect role headers: lines with common title patterns
    if (
      line.match(/^(senior|lead|staff|principal|junior|associate|manager|director|vp|head|chief)/i) ||
      line.match(/\b(engineer|developer|designer|manager|analyst|architect|consultant|specialist)\b/i) &&
      line.match(/\b(at|@|—|–|-|,)\b/i)
    ) {
      roleCount++;
      if (roleCount > 3) {
        cutIndex = i;
        break;
      }
    }
  }

  let trimmed = lines.slice(0, cutIndex).join('\n');

  // If still too long, hard-truncate
  if (trimmed.length > RESUME_MAX_CHARS) {
    trimmed = trimmed.substring(0, RESUME_MAX_CHARS);
    // Try to end at a sentence boundary
    const lastPeriod = trimmed.lastIndexOf('.');
    if (lastPeriod > RESUME_MAX_CHARS * 0.8) {
      trimmed = trimmed.substring(0, lastPeriod + 1);
    }
  }

  return { text: trimmed, wasTrimmed: true };
}

export function trimJobDescription(text: string): TrimResult {
  if (text.length <= JD_MAX_CHARS) {
    return { text, wasTrimmed: false };
  }

  let trimmed = text.substring(0, JD_MAX_CHARS);
  const lastPeriod = trimmed.lastIndexOf('.');
  if (lastPeriod > JD_MAX_CHARS * 0.8) {
    trimmed = trimmed.substring(0, lastPeriod + 1);
  }

  return { text: trimmed, wasTrimmed: true };
}
