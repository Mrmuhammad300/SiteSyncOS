import { prisma } from './db';
import { NotificationType, NotificationCategory } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  sendEmail?: boolean;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    category,
    title,
    message,
    entityType,
    entityId,
    actionUrl,
    sendEmail = false,
  } = params;

  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        category,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        emailSent: false,
      },
    });

    // Check user preferences and send email if needed
    if (sendEmail) {
      await sendNotificationEmail(notification.id, userId, title, message, actionUrl);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Send notification email
 */
async function sendNotificationEmail(
  notificationId: string,
  userId: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) return;

    // Get notification preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // If user has disabled email notifications, skip
    if (preferences && !preferences.inAppAll) {
      return;
    }

    // Send email using notification email API
    const emailApiUrl = process.env.NOTIFICATION_EMAIL_API_URL;
    const emailApiKey = process.env.NOTIFICATION_EMAIL_API_KEY;

    if (!emailApiUrl || !emailApiKey) {
      console.warn('Email notification not configured');
      return;
    }

    const actionLink = actionUrl ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${actionUrl}` : undefined;

    const response = await fetch(emailApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emailApiKey}`,
      },
      body: JSON.stringify({
        to: user.email,
        subject: `SiteSync OS - ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">SiteSync OS</h1>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${message}</p>
              ${actionLink ? `
                <div style="margin: 30px 0;">
                  <a href="${actionLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Details</a>
                </div>
              ` : ''}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #6b7280; font-size: 14px;">You received this email because you have notifications enabled in your SiteSync OS account.</p>
              <p style="color: #6b7280; font-size: 14px;">To manage your notification preferences, visit your <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/profile/notifications" style="color: #667eea;">account settings</a>.</p>
            </div>
          </div>
        `,
      }),
    });

    if (response.ok) {
      // Update notification to mark email as sent
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
        },
      });
    } else {
      console.error('Failed to send email notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

/**
 * Create notification for RFI response
 */
export async function notifyRFIResponse(rfiId: string, responderId: string) {
  try {
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: {
        submittedBy: true,
        project: true,
      },
    });

    if (!rfi || !rfi.submittedById) return;

    // Don't notify the responder themselves
    if (rfi.submittedById === responderId) return;

    const responder = await prisma.user.findUnique({
      where: { id: responderId },
      select: { firstName: true, lastName: true },
    });

    if (!responder) return;

    await createNotification({
      userId: rfi.submittedById,
      type: 'RFI_RESPONSE',
      category: 'RFI',
      title: 'New RFI Response',
      message: `${responder.firstName} ${responder.lastName} responded to RFI #${rfi.rfiNumber} on ${rfi.project.name}`,
      entityType: 'RFI',
      entityId: rfiId,
      actionUrl: `/rfis/${rfiId}`,
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating RFI response notification:', error);
  }
}

/**
 * Create notification for RFI assignment
 */
export async function notifyRFIAssignment(rfiId: string, assigneeId: string) {
  try {
    const rfi = await prisma.rFI.findUnique({
      where: { id: rfiId },
      include: {
        project: true,
      },
    });

    if (!rfi) return;

    await createNotification({
      userId: assigneeId,
      type: 'RFI_ASSIGNED',
      category: 'RFI',
      title: 'New RFI Assigned',
      message: `You have been assigned to RFI #${rfi.rfiNumber}: ${rfi.subject}`,
      entityType: 'RFI',
      entityId: rfiId,
      actionUrl: `/rfis/${rfiId}`,
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating RFI assignment notification:', error);
  }
}

/**
 * Create notification for submittal status change
 */
export async function notifySubmittalStatusChange(
  submittalId: string,
  newStatus: string,
  reviewerId: string
) {
  try {
    const submittal = await prisma.submittal.findUnique({
      where: { id: submittalId },
      include: {
        submittedBy: true,
        project: true,
      },
    });

    if (!submittal || !submittal.submittedById) return;

    // Don't notify the reviewer themselves
    if (submittal.submittedById === reviewerId) return;

    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { firstName: true, lastName: true },
    });

    if (!reviewer) return;

    await createNotification({
      userId: submittal.submittedById,
      type: 'SUBMITTAL_STATUS_CHANGE',
      category: 'SUBMITTAL',
      title: 'Submittal Status Updated',
      message: `${reviewer.firstName} ${reviewer.lastName} updated submittal #${submittal.submittalNumber} to ${newStatus}`,
      entityType: 'Submittal',
      entityId: submittalId,
      actionUrl: `/submittals/${submittalId}`,
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating submittal status notification:', error);
  }
}

/**
 * Create notification for change order status
 */
export async function notifyChangeOrderStatus(
  changeOrderId: string,
  newStatus: string,
  approverId?: string
) {
  try {
    const changeOrder = await prisma.changeOrder.findUnique({
      where: { id: changeOrderId },
      include: {
        requestedBy: true,
        project: true,
      },
    });

    if (!changeOrder || !changeOrder.requestedById) return;

    // Don't notify the approver themselves
    if (changeOrder.requestedById === approverId) return;

    const notificationType = newStatus === 'Approved' 
      ? 'CHANGE_ORDER_APPROVED' 
      : newStatus === 'Rejected'
      ? 'CHANGE_ORDER_REJECTED'
      : 'CHANGE_ORDER_SUBMITTED';

    await createNotification({
      userId: changeOrder.requestedById,
      type: notificationType,
      category: 'CHANGE_ORDER',
      title: `Change Order ${newStatus}`,
      message: `Change Order #${changeOrder.changeOrderNumber} for ${changeOrder.project.name} has been ${newStatus.toLowerCase()}`,
      entityType: 'ChangeOrder',
      entityId: changeOrderId,
      actionUrl: `/change-orders`,
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating change order notification:', error);
  }
}

/**
 * Create notification for punch item assignment
 */
export async function notifyPunchItemAssignment(punchItemId: string, assigneeId: string) {
  try {
    const punchItem = await prisma.punchItem.findUnique({
      where: { id: punchItemId },
      include: {
        project: true,
      },
    });

    if (!punchItem) return;

    await createNotification({
      userId: assigneeId,
      type: 'PUNCH_ITEM_ASSIGNED',
      category: 'PUNCH_ITEM',
      title: 'New Punch Item Assigned',
      message: `You have been assigned punch item #${punchItem.itemNumber}: ${punchItem.description}`,
      entityType: 'PunchItem',
      entityId: punchItemId,
      actionUrl: `/punch-items`,
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating punch item assignment notification:', error);
  }
}
