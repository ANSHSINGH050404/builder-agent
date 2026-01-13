import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface PreviewFrameProps {
  webContainer: WebContainer | undefined;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");

  async function main() {
    if (!webContainer) return;

    setStatus("Installing dependencies...");
    const installProcess = await webContainer.spawn("npm", ["install"]);

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log("Installing:", data);
        },
      })
    );

    const installExitCode = await installProcess.exit;

    if (installExitCode !== 0) {
      setStatus("Installation failed. Check console.");
      return;
    }

    setStatus("Starting development server...");
    await webContainer.spawn("npm", ["run", "dev"]);

    // Wait for `server-ready` event
    webContainer.on("server-ready", (_port, url) => {
      console.log("Server ready at:", url);
      setUrl(url);
      setStatus("Ready");
    });
  }

  useEffect(() => {
    main();
  }, [webContainer]);

  if (!webContainer) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="mb-2">Initializing WebContainer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-900 overflow-hidden">
      {!url && (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="mb-2 font-medium">
              {status || "Preparing environment..."}
            </p>
          </div>
        </div>
      )}
      {url && (
        <iframe width={"100%"} height={"100%"} src={url} className="bg-white" />
      )}
    </div>
  );
}
