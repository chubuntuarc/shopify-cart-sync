// pages/api/webhooks/customers-data-request.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // TODO: Verify HMAC and process the request
  res.status(200).end();
}