import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import {
  sendDesignTaskToExternalPlatform,
  generateCallbackUrl,
  getCallbackSecret,
  type DesignTaskPayload,
} from '@/lib/design-webhook';

// POST /api/design-requests/[id]/retry - Retry failed tasks
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { taskIds } = data; // Optional: specific task IDs to retry. If empty, retry all failed.

    // Get design request with tasks
    const designRequest = await db.designRequest.findUnique({
      where: { id: params.id },
      include: { tasks: true },
    });

    if (!designRequest) {
      return NextResponse.json(
        { error: 'Design request not found' },
        { status: 404 }
      );
    }

    // Find failed tasks to retry
    const failedTasks = designRequest.tasks.filter((t: any) => {
      if (t.status !== 'Failed') return false;
      if (taskIds && taskIds.length > 0) {
        return taskIds.includes(t.id);
      }
      return true;
    });

    if (failedTasks.length === 0) {
      return NextResponse.json(
        { error: 'No failed tasks found to retry' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const task of failedTasks) {
      try {
        // Build payload from stored data or reconstruct
        const payload: DesignTaskPayload = {
          action: 'create_design_task',
          requestId: designRequest.id,
          requestNumber: designRequest.requestNumber,
          taskId: task.id,
          taskType: task.taskType,
          title: task.title,
          description: task.description || `${task.taskType} for ${designRequest.projectName}`,
          priority: task.priority || 'Normal',
          projectName: designRequest.projectName,
          projectType: designRequest.projectType,
          requirements: designRequest.requirements,
          siteDetails: designRequest.siteDetails || '',
          budget: designRequest.budget || undefined,
          timeline: designRequest.timeline,
          clientName: designRequest.clientName,
          clientEmail: designRequest.clientEmail,
          clientPhone: designRequest.clientPhone || undefined,
          designConcept: designRequest.designConcept || undefined,
          styleRecommendations: designRequest.styleRecommendations || undefined,
          spatialLayout: designRequest.spatialLayout || undefined,
          materialSuggestions: designRequest.materialSuggestions || undefined,
          sustainabilityFeatures: designRequest.sustainabilityFeatures || undefined,
          visualizationPrompt: designRequest.visualizationPrompt || undefined,
          callbackUrl: generateCallbackUrl(designRequest.id, task.id),
          callbackSecret: getCallbackSecret(),
        };

        // Clear previous error and reset status before retry
        await db.designTask.update({
          where: { id: task.id },
          data: {
            status: 'Pending',
            errorMessage: null,
          },
        });

        // Send to external platform (includes built-in retry logic)
        const response = await sendDesignTaskToExternalPlatform(payload);

        if (response.success) {
          await db.designTask.update({
            where: { id: task.id },
            data: {
              sentToExternalPlatform: true,
              externalTaskId: response.externalTaskId,
              externalStatus: response.status,
              status: 'Queued',
              errorMessage: null,
              webhookPayload: JSON.stringify(payload),
              webhookResponse: JSON.stringify(response),
              retryCount: (task.retryCount || 0) + 1,
              lastSyncAt: new Date(),
            },
          });

          results.push({
            taskId: task.id,
            taskType: task.taskType,
            status: 'success',
            externalTaskId: response.externalTaskId,
          });
        } else {
          await db.designTask.update({
            where: { id: task.id },
            data: {
              status: 'Failed',
              errorMessage: response.error,
              retryCount: (task.retryCount || 0) + 1,
              webhookResponse: JSON.stringify(response),
            },
          });

          errors.push({
            taskId: task.id,
            taskType: task.taskType,
            error: response.error,
          });
        }
      } catch (error: any) {
        console.error(`Error retrying task ${task.id}:`, error);
        errors.push({
          taskId: task.id,
          taskType: task.taskType,
          error: error.message,
        });
      }
    }

    // Update design request status if any tasks succeeded
    if (results.length > 0) {
      await db.designRequest.update({
        where: { id: params.id },
        data: {
          status: 'AIProcessing',
        },
      });
    }

    return NextResponse.json({
      success: results.length > 0,
      retriedCount: failedTasks.length,
      succeeded: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error retrying design tasks:', error);
    return NextResponse.json(
      { error: 'Failed to retry design tasks' },
      { status: 500 }
    );
  }
}
