const audioExtensions: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
};

export function mediaMimeType(file: { name: string; type: string }) {
  const type = file.type.split(";")[0].trim().toLowerCase();
  if (type && type !== "application/octet-stream") return type;
  return (
    audioExtensions[file.name.split(".").pop()?.toLowerCase() || ""] || type
  );
}

export function audioExtension(type: string) {
  const mime = type.split(";")[0].trim().toLowerCase();
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}
