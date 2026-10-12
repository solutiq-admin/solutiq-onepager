import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Deliveries } from "./collections/Deliveries";
import { Events } from "./collections/Events";
import { FormTemplates } from "./collections/FormTemplates";
import { Guestlist } from "./collections/Guestlist";
import { Messages } from "./collections/Messages";
import { People } from "./collections/People";
import { Users } from "./collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const productionURL = "https://solutiq.africa";
const localURLs = ["http://localhost:3000"];

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, "app"),
    },
    meta: {
      titleSuffix: "- SOLUTIQ Admin",
      icons: [{ rel: "icon", type: "image/png", url: "/assets/solutiq-favicon.png" }],
    },
    // Dark only: the logo is white and the brand canvas is black.
    theme: "dark",
    components: {
      graphics: {
        Logo: "@/components/admin/Logo#Logo",
        Icon: "@/components/admin/Icon#Icon",
      },
    },
  },
  // Order sets the admin nav. Groups are set on each collection:
  // Events (Events, Form templates, Guestlist, Messages, Deliveries), People (People), Settings (Users).
  collections: [Events, FormTemplates, Guestlist, Messages, Deliveries, People, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    schemaName: "payload",
    push: process.env.NODE_ENV === "development",
    pool: {
      connectionString: process.env.DATABASE_URI,
      max: 5,
    },
  }),
  sharp,
  cors: [productionURL, ...localURLs],
  csrf: [productionURL, ...localURLs],
});
