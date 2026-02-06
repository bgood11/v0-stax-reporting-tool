import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFilterOptions } from '@/lib/report-service';
import { getAuthContext } from '@/lib/middleware/auth';
import { createError } from '@/lib/error-handler';
import { createErrorResponse, createAuthErrorResponse, createServerErrorResponse } from '@/lib/error-response';

const CONTEXT = 'filters/options';

export async function GET() {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createAuthErrorResponse(CONTEXT);
  }

  // Get auth context for BDM data filtering
  let authContext;
  try {
    authContext = await getAuthContext();
  } catch (contextError: any) {
    const error = createError('FORBIDDEN', contextError.message);
    return createErrorResponse(error, CONTEXT);
  }

  try {
    const options = await getFilterOptions(authContext);
    return NextResponse.json(options);
  } catch (error: any) {
    const appError = createError(
      'SERVER_ERROR',
      error.message || 'Failed to get filter options',
      {
        userMessage: 'Unable to load filter options. Please refresh and try again.'
      }
    );
    return createErrorResponse(appError, CONTEXT);
  }
}
