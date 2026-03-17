import React, { useCallback, useState } from "react";
import { UploadCloud, Link as LinkIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [inputType, setInputType] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const MAX_DIMENSION = 1200;
  const JPEG_QUALITY = 0.85;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        handleFile(file);
      }
    },
    [onChange]
  );

  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onChange(data.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      // Fallback or show toast here later if needed
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput) {
      onChange(urlInput);
      setUrlInput("");
    }
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative group rounded-xl border border-border/50 bg-muted/20 flex flex-col items-center justify-center p-4">
          <div className="w-full relative flex items-center justify-center" style={{ minHeight: '200px' }}>
            <img src={value} alt="Uploaded preview" className="w-full h-auto object-contain" style={{ maxHeight: '300px' }} />
          </div>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-xl">
            <Button type="button" variant="destructive" size="sm" onClick={() => onChange("")}>
              <X className="w-4 h-4 mr-2" />
              Remove Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            <Button 
              type="button" 
              variant={inputType === "file" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setInputType("file")}
              className="text-xs"
            >
              Upload File
            </Button>
            <Button 
              type="button" 
              variant={inputType === "url" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setInputType("url")}
              className="text-xs"
            >
              Paste URL
            </Button>
          </div>

          {inputType === "file" && (
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-background shadow-sm border border-border/50 flex items-center justify-center mb-2">
                  <UploadCloud className={`w-6 h-6 text-primary ${isUploading ? "animate-pulse" : ""}`} />
                </div>
                <p className="font-medium text-foreground">
                  {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs">SVG, PNG, JPG or GIF (max. 5MB)</p>
              </div>
            </div>
          )}

          {inputType === "url" && (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="image-url" 
                    placeholder="https://example.com/image.jpg" 
                    value={urlInput} 
                    onChange={(e) => setUrlInput(e.target.value)} 
                    className="pl-9"
                  />
                </div>
              </div>
              <Button type="button" onClick={handleUrlSubmit} disabled={!urlInput}>
                Add
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
