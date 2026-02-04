import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAccessToken } from '@/lib/salesforce';

// API route to describe Salesforce objects and get exact field names
export async function GET(request: NextRequest) {
  // Optional auth check - for now allow access to help debug
  const objectName = request.nextUrl.searchParams.get('object') || 'Application_Decision__c';

  try {
    const { token, instanceUrl } = await getSalesforceAccessToken();

    const url = `${instanceUrl}/services/data/v59.0/sobjects/${objectName}/describe/`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: `Failed to describe ${objectName}`,
        details: errorText
      }, { status: response.status });
    }

    const describe = await response.json();

    // Extract relevant field info
    const fields = describe.fields.map((f: any) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      referenceTo: f.referenceTo,
      relationshipName: f.relationshipName,
      custom: f.custom,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Group by category for easier reading
    const standardFields = fields.filter((f: any) => !f.custom);
    const customFields = fields.filter((f: any) => f.custom);

    return NextResponse.json({
      objectName,
      totalFields: fields.length,
      standardFields,
      customFields,
      allFields: fields,
    });

  } catch (error: any) {
    console.error('Describe error:', error);
    return NextResponse.json({
      error: 'Failed to describe object',
      details: error.message
    }, { status: 500 });
  }
}
