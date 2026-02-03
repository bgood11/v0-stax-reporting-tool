import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

// Mock data for demonstration
const mockData = [
  { group: "Pepper Money", volume: 145, total_loan_value: 4250000, total_commission: 127500, approval_rate: 82.5 },
  { group: "Liberty", volume: 98, total_loan_value: 2890000, total_commission: 86700, approval_rate: 78.2 },
  { group: "Latitude", volume: 112, total_loan_value: 3150000, total_commission: 94500, approval_rate: 75.8 },
  { group: "Westpac", volume: 87, total_loan_value: 2650000, total_commission: 79500, approval_rate: 71.4 },
  { group: "ANZ", volume: 65, total_loan_value: 1980000, total_commission: 59400, approval_rate: 69.2 },
  { group: "NAB", volume: 54, total_loan_value: 1620000, total_commission: 48600, approval_rate: 85.1 },
  { group: "CBA", volume: 43, total_loan_value: 1290000, total_commission: 38700, approval_rate: 72.3 },
];

const mockSummary = {
  total_records: 604,
  total_loan_value: 17830000,
  total_commission: 534900,
  approval_rate: 76.4
};

export async function POST(request: NextRequest) {
  // Verify auth
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const auth = await verifySession(sessionToken);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { page = 1, pageSize = 50 } = await request.json();

  // Return mock data for demo
  return NextResponse.json({
    data: mockData,
    summary: mockSummary,
    pagination: {
      page,
      pageSize,
      total: mockData.length,
      totalPages: 1
    }
  });
}
