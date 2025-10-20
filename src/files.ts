import { readFile } from "fs/promises";
import { join } from "path";
import { globby } from "globby";
import { FileBlob } from "./types";
import { createError } from "./errors";

/**
 * Resolve file globs to actual file paths
 */
export async function resolveFiles(
  patterns: string[],
  cwd: string = process.cwd(),
): Promise<string[]> {
  try {
    const files = await globby(patterns, {
      cwd,
      gitignore: false,
      dot: true,
      onlyFiles: true,
    });
    return files;
  } catch (error: any) {
    throw createError(
      "ENOFILES",
      "Failed to resolve file patterns",
      error.message,
    );
  }
}

/**
 * Detect if a file should be treated as binary
 */
function isBinaryFile(path: string): boolean {
  const binaryExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".bmp",
    ".svg",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".bz2",
    ".7z",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".otf",
    ".mp3",
    ".mp4",
    ".avi",
    ".mov",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
  ];

  const lastDotIndex = path.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return false; // No extension, treat as text
  }
  const ext = path.toLowerCase().substring(lastDotIndex);
  return binaryExtensions.includes(ext);
}

/**
 * Read a file and prepare it as a blob
 */
export async function readFileAsBlob(
  path: string,
  cwd: string = process.cwd(),
): Promise<FileBlob> {
  try {
    const fullPath = join(cwd, path);
    const isBinary = isBinaryFile(path);

    if (isBinary) {
      // Read as base64 for binary files
      const buffer = await readFile(fullPath);
      return {
        path,
        content: buffer.toString("base64"),
        encoding: "base64",
      };
    } else {
      // Read as utf-8 for text files
      const content = await readFile(fullPath, "utf-8");
      return {
        path,
        content,
        encoding: "utf-8",
      };
    }
  } catch (error: any) {
    throw createError(
      "ENOFILES",
      `Failed to read file: ${path}`,
      error.message,
    );
  }
}

/**
 * Read multiple files as blobs
 */
export async function readFilesAsBlobs(
  paths: string[],
  cwd: string = process.cwd(),
): Promise<FileBlob[]> {
  const blobs: FileBlob[] = [];

  for (const path of paths) {
    const blob = await readFileAsBlob(path, cwd);
    blobs.push(blob);
  }

  return blobs;
}
