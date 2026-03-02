/**
 * Integration with external AI Design & Rendering Platform
 * Webhook URL: https://gmllorlxfsxmsejhsjpa.supabase.co/functions/v1/n8n-orders-webhook
 */

export interface DesignTaskPayload {
  // Action identifier for n8n workflow
  action: string; // e.g., 'create_design_task', 'submit_design_request'
  
  // Request identification
  requestId: string;
  requestNumber: string;
  taskId: string;
  
  // Task details
  taskType: string; // 'Architectural', 'Structural', 'MEPDesign', 'InteriorDesign', 'Landscaping', 'Rendering', 'ThreeD_Modeling', 'Documentation'
  title: string;
  description: string;
  priority: string;
  
  // Project information
  projectName: string;
  projectType: string;
  
  // Design requirements
  requirements: string;
  siteDetails?: string;
  budget?: number;
  timeline: string;
  
  // Client information
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  
  // AI Analysis (if available)
  designConcept?: string;
  styleRecommendations?: string;
  spatialLayout?: string;
  materialSuggestions?: string;
  sustainabilityFeatures?: string;
  visualizationPrompt?: string;
  
  // Callback configuration
  callbackUrl: string;
  callbackSecret: string;
}

export interface DesignTaskResponse {
  success: boolean;
  externalTaskId?: string;
  status?: string;
  message?: string;
  estimatedCompletionTime?: string;
  error?: string;
}

export interface WebhookCallbackPayload {
  // Task identification
  externalTaskId: string;
  requestId: string;
  taskId: string;
  
  // Status update
  status: string; // 'queued', 'processing', 'completed', 'failed'
  progress?: number; // 0-100
  
  // Results (when completed)
  resultUrl?: string;
  resultFiles?: string[];
  resultData?: any;
  
  // Error information (when failed)
  errorMessage?: string;
  errorDetails?: any;
  
  // Timestamps
  startedAt?: string;
  completedAt?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

const DESIGN_WEBHOOK_URL = process.env.DESIGN_WEBHOOK_URL;
const WEBHOOK_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000; // 2 seconds

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Attempt a single fetch to the external platform
 */
async function attemptExternalRequest(
  payload: DesignTaskPayload
): Promise<DesignTaskResponse> {
  if (!DESIGN_WEBHOOK_URL) {
    return { success: false, error: 'DESIGN_WEBHOOK_URL is not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

  try {
    const response = await fetch(DESIGN_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SiteSyncOS-DesignServices/1.0',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Read response as text first for reliable parsing
    const responseText = await response.text().catch(() => '');

    // Try to parse as JSON
    let responseData: any = null;
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Response is not JSON - handle based on HTTP status
        console.warn('[Design Webhook] Non-JSON response received:', {
          status: response.status,
          contentType: response.headers.get('content-type'),
          bodyPreview: responseText.substring(0, 200),
        });
      }
    }

    if (!response.ok) {
      const errorMessage = responseData?.error
        || responseData?.message
        || (responseText ? `HTTP ${response.status}: ${responseText.substring(0, 200)}` : `HTTP ${response.status}: ${response.statusText}`);

      console.error('[Design Webhook] External platform returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }

    // HTTP 2xx - success
    // If we got valid JSON, extract the task details
    if (responseData && typeof responseData === 'object') {
      console.log('[Design Webhook] Task sent successfully (JSON response):', {
        taskId: payload.taskId,
        externalTaskId: responseData.externalTaskId || responseData.taskId || responseData.id,
        status: responseData.status,
      });

      return {
        success: true,
        externalTaskId: responseData.externalTaskId || responseData.taskId || responseData.id || `ext-${payload.taskId}`,
        status: responseData.status || 'queued',
        message: responseData.message || 'Task accepted by external platform',
        estimatedCompletionTime: responseData.estimatedCompletionTime,
      };
    }

    // Non-JSON success response (e.g., "ok", empty body, HTML acknowledgment)
    // Treat as accepted since the HTTP status was 2xx
    console.log('[Design Webhook] Task sent successfully (non-JSON response):', {
      taskId: payload.taskId,
      responsePreview: responseText.substring(0, 100),
    });

    return {
      success: true,
      externalTaskId: `ext-${payload.taskId}-${Date.now()}`,
      status: 'queued',
      message: responseText || 'Task accepted by external platform (non-JSON acknowledgment)',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout: External platform did not respond within 30 seconds',
      };
    }

    return {
      success: false,
      error: `Connection error: ${error.message || 'Failed to connect to external platform'}`,
    };
  }
}

/**
 * Send a design task to the external AI platform with retry logic
 */
export async function sendDesignTaskToExternalPlatform(
  payload: DesignTaskPayload
): Promise<DesignTaskResponse> {
  console.log('[Design Webhook] Sending task to external platform:', {
    taskId: payload.taskId,
    taskType: payload.taskType,
    webhookUrl: DESIGN_WEBHOOK_URL,
  });

  let lastError: DesignTaskResponse = {
    success: false,
    error: 'Unknown error',
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
      console.log(`[Design Webhook] Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms for task ${payload.taskId}`);
      await sleep(delay);
    }

    const result = await attemptExternalRequest(payload);

    if (result.success) {
      if (attempt > 0) {
        console.log(`[Design Webhook] Task ${payload.taskId} succeeded on retry attempt ${attempt}`);
      }
      return result;
    }

    lastError = result;

    // Don't retry on client errors (4xx) - only retry on server/network errors
    const errorStr = result.error || '';
    const isClientError = errorStr.includes('HTTP 4');
    if (isClientError) {
      console.error(`[Design Webhook] Client error for task ${payload.taskId}, not retrying:`, result.error);
      break;
    }

    console.warn(`[Design Webhook] Attempt ${attempt + 1} failed for task ${payload.taskId}:`, result.error);
  }

  console.error(`[Design Webhook] All attempts failed for task ${payload.taskId}:`, lastError.error);
  return lastError;
}

/**
 * Verify webhook callback signature/secret
 */
export function verifyWebhookCallback(
  payload: any,
  providedSecret: string
): boolean {
  const expectedSecret = process.env.DESIGN_WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    console.warn('[Design Webhook] DESIGN_WEBHOOK_SECRET not configured');
    return false;
  }

  return providedSecret === expectedSecret;
}

/**
 * Generate callback URL for webhook responses
 */
export function generateCallbackUrl(requestId: string, taskId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://development.abacusai.app';
  return `${baseUrl}/api/webhooks/design-callback`;
}

/**
 * Get callback secret for webhook authentication
 */
export function getCallbackSecret(): string {
  const secret = process.env.DESIGN_WEBHOOK_SECRET;
  if (!secret) throw new Error('DESIGN_WEBHOOK_SECRET is not configured');
  return secret;
}

/**
 * Process webhook callback payload and update task status
 */
export function parseWebhookCallback(body: any): WebhookCallbackPayload | null {
  try {
    // Validate required fields
    if (!body.externalTaskId && !body.taskId) {
      console.error('[Design Webhook] Missing externalTaskId/taskId in callback');
      return null;
    }

    if (!body.status) {
      console.error('[Design Webhook] Missing status in callback');
      return null;
    }

    return {
      externalTaskId: body.externalTaskId || body.taskId,
      requestId: body.requestId,
      taskId: body.taskId,
      status: body.status,
      progress: body.progress,
      resultUrl: body.resultUrl,
      resultFiles: body.resultFiles || [],
      resultData: body.resultData || body.data,
      errorMessage: body.errorMessage || body.error,
      errorDetails: body.errorDetails,
      startedAt: body.startedAt,
      completedAt: body.completedAt,
      metadata: body.metadata || {},
    };
  } catch (error) {
    console.error('[Design Webhook] Failed to parse callback payload:', error);
    return null;
  }
}

/**
 * Map external status to internal TaskStatus enum
 */
export function mapExternalStatus(externalStatus: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'Queued',
    'pending': 'Pending',
    'processing': 'Processing',
    'in_progress': 'Processing',
    'completed': 'Completed',
    'success': 'Completed',
    'failed': 'Failed',
    'error': 'Failed',
    'cancelled': 'Cancelled',
    'canceled': 'Cancelled',
  };

  return statusMap[externalStatus.toLowerCase()] || 'Pending';
}
