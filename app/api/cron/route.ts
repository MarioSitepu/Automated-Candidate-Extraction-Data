import { GET as keepAliveGet } from "../keep-alive/route";

export async function GET() {
  return keepAliveGet();
}
