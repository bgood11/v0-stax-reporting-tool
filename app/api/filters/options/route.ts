import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

// Mock filter options for demonstration
const mockFilterOptions = {
  lenders: ['Pepper Money', 'Liberty', 'Latitude', 'Westpac', 'ANZ', 'NAB', 'CBA'],
  retailers: ['Harvey Norman', 'JB Hi-Fi', 'The Good Guys', 'Officeworks', 'Bunnings', 'Beacon Lighting'],
  bdms: ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'James Wilson'],
  statuses: ['Created', 'Referred', 'Approved', 'Declined', 'Executed', 'Live', 'Cancelled', 'Expired'],
  financeProducts: ['Interest Free', 'Low Rate', 'Buy Now Pay Later', 'Standard Credit']
};

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const auth = await verifySession(sessionToken);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Return mock filter options
  return NextResponse.json(mockFilterOptions);
}
