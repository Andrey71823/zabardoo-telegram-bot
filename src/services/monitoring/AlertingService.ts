import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { PerformanceMonitor, Alert, SystemMetrics } from './PerformanceMonitor';

export interface NotificationChannel {
    id: string;
    name: string;
    type: 'email' | 'slack' | 'webhook' | 'telegram' | 'sms';
    config: {
        url?: string;
        token?: string;
        channel?: string;
        recipients?: string[];
        headers?: Record<string, string>;
    };
    enabled: boolean;
    filters: {
        levels: Alert['level'][];
        categories: Alert['category'][];
        keywords?: string[];
    };
}

export interface AlertingRule {
    id: string;
    name: i
mport { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { performanceMonitor, Alert, AlertRule } from './PerformanceMonitor';

export interface NotificationChannel {
    id: string;
    name: string;
    type: 'email' | 'slack' | 'webhook' | 'telegram' | 'sms';
    config: {
        [key: string]: any;
    };
    enabled: boolean;
    alertLevels: ('info' | 'warning' | 'error' | 'critical')[];
}

export interface AlertNotification {
    id: string;
    alertId: string;
    channelId: string;
    timestamp: Date;
    status: 'pending' | 'sent' | 'failed' | 'retrying';
    attempts: number;
    lastAttempt?: Date;
    error?: string;
}

export interface EscalationRule {
    id: string;
    name: string;
    alertLevel: 'warning' | 'error' | 'critical';
    timeThreshold: number; // milliseconds
    escalationChannels: string[];
    enabled: boolean;
}

export class AlertingService extends EventEmitter {
    private notificationChannels: Map<string, NotificationChannel> = new Map();
    private notifications: Map<string, AlertNotification> = new Map();
    private escalationRules: Map<string, EscalationRule> = new Map();
    private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
    private retryTimer?: NodeJS.Timeout;
    private isInitialized: boolean = false;

    constructor() {
        super();
        this.initializeDefaultChannels();
        this.initializeDefaultEscalationRules();
    }

    /**
     * Initialize the alerting service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        // Listen to performance monitor alerts
        performanceMonitor.on('alertTriggered', (alert: Alert) => {
            this.handleAlert(alert);
        });

        performanceMonitor.on('alertResolved', (alert: Alert) => {
            this.handleAlertResolution(alert);
        });

        // Start retry mechanism for failed notifications
        this.startRetryMechanism();

        this.isInitialized = true;
        logger.info('AlertingService: Initialized successfully');
    }

    /**
     * Initialize default notification channels
     */
    private initializeDefaultChannels(): void {
        const defaultChannels: NotificationChannel[] = [
            {
                id: 'console-log',
                name: 'Console Log',
                type: 'webhook',
                config: {
                    url: 'console',
                    method: 'log'
                },
                enabled: true,
                alertLevels: ['info', 'warning', 'error', 'critical']
            },
            {
                id: 'email-admin',
                name: 'Admin Email',
                type: 'email',
                config: {
                    to: 'admin@example.com',
                    from: 'alerts@system.com',
                    smtp: {
                        host: 'smtp.example.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: 'alerts@system.com',
                            pass: 'password'
                        }
                    }
                },
                enabled: false, // Disabled by default
                alertLevels: ['error', 'critical']
            },
            {
                id: 'slack-alerts',
                name: 'Slack Alerts',
                type: 'slack',
                config: {
                    webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
                    channel: '#alerts',
                    username: 'AlertBot'
                },
                enabled: false, // Disabled by default
                alertLevels: ['warning', 'error', 'critical']
            }
        ];

        defaultChannels.forEach(channel => {
            this.notificationChannels.set(channel.id, channel);
        });
    }

    /**
     * Initialize default escalation rules
     */
    private initializeDefaultEscalationRules(): void {
        const defaultRules: EscalationRule[] = [
            {
                id: 'critical-escalation',
                name: 'Critical Alert Escalation',
                alertLevel: 'critical',
                timeThreshold: 300000, // 5 minutes
                escalationChannels: ['email-admin', 'slack-alerts'],
                enabled: true
            },
            {
                id: 'error-escalation',
                name: 'Error Alert Escalation',
                alertLevel: 'error',
                timeThreshold: 900000, // 15 minutes
                escalationChannels: ['email-admin'],
                enabled: true
            }
        ];

        defaultRules.forEach(rule => {
            this.escalationRules.set(rule.id, rule);
        });
    }

    /**
     * Handle new alert
     */
    private async handleAlert(alert: Alert): Promise<void> {
        logger.info(`AlertingService: Handling alert ${alert.id}: ${alert.title}`);

        // Send notifications to appropriate channels
        await this.sendAlertNotifications(alert);

        // Set up escalation if needed
        this.setupEscalation(alert);

        this.emit('alertHandled', alert);
    }

    /**
     * Handle alert resolution
     */
    private async handleAlertResolution(alert: Alert): Promise<void> {
        logger.info(`AlertingService: Handling alert resolution ${alert.id}: ${alert.title}`);

        // Cancel escalation timer if exists
        const escalationTimer = this.escalationTimers.get(alert.id);
        if (escalationTimer) {
            clearTimeout(escalationTimer);
            this.escalationTimers.delete(alert.id);
        }

        // Send resolution notifications
        await this.sendResolutionNotifications(alert);

        this.emit('alertResolved', alert);
    }

    /**
     * Send alert notifications to configured channels
     */
    private async sendAlertNotifications(alert: Alert): Promise<void> {
        const eligibleChannels = Array.from(this.notificationChannels.values())
            .filter(channel =>
                channel.enabled &&
                channel.alertLevels.includes(alert.level)
            );

        for (const channel of eligibleChannels) {
            try {
                await this.sendNotification(alert, channel, 'alert');
            } catch (error) {
                logger.error(`AlertingService: Failed to send notification to ${channel.name}:`, error);
            }
        }
    }

    /**
     * Send resolution notifications
     */
    private async sendResolutionNotifications(alert: Alert): Promise<void> {
        const eligibleChannels = Array.from(this.notificationChannels.values())
            .filter(channel =>
                channel.enabled &&
                channel.alertLevels.includes(alert.level)
            );

        for (const channel of eligibleChannels) {
            try {
                await this.sendNotification(alert, channel, 'resolution');
            } catch (error) {
                logger.error(`AlertingService: Failed to send resolution notification to ${channel.name}:`, error);
            }
        }
    }

    /**
     * Send notification to a specific channel
     */
    private async sendNotification(
        alert: Alert,
        channel: NotificationChannel,
        type: 'alert' | 'resolution' | 'escalation'
    ): Promise<void> {
        const notification: AlertNotification = {
            id: this.generateNotificationId(),
            alertId: alert.id,
            channelId: channel.id,
            timestamp: new Date(),
            status: 'pending',
            attempts: 0
        };

        this.notifications.set(notification.id, notification);

        try {
            await this.deliverNotification(alert, channel, type, notification);
            notification.status = 'sent';
            logger.info(`AlertingService: Notification sent successfully to ${channel.name}`);
        } catch (error) {
            notification.status = 'failed';
            notification.error = error instanceof Error ? error.message : String(error);
            notification.lastAttempt = new Date();
            logger.error(`AlertingService: Failed to send notification to ${channel.name}:`, error);
        }
    }

    /**
     * Deliver notification based on channel type
     */
    private async deliverNotification(
        alert: Alert,
        channel: NotificationChannel,
        type: 'alert' | 'resolution' | 'escalation',
        notification: AlertNotification
    ): Promise<void> {
        notification.attempts++;
        notification.lastAttempt = new Date();

        const message = this.formatMessage(alert, type);

        switch (channel.type) {
            case 'email':
                await this.sendEmailNotification(alert, channel, message);
                break;
            case 'slack':
                await this.sendSlackNotification(alert, channel, message);
                break;
            case 'webhook':
                await this.sendWebhookNotification(alert, channel, message);
                break;
            case 'telegram':
                await this.sendTelegramNotification(alert, channel, message);
                break;
            case 'sms':
                await this.sendSMSNotification(alert, channel, message);
                break;
            default:
                throw new Error(`Unsupported channel type: ${channel.type}`);
        }
    }

    /**
     * Format alert message
     */
    private formatMessage(alert: Alert, type: 'alert' | 'resolution' | 'escalation'): string {
        const emoji = this.getAlertEmoji(alert.level);
        const typeText = type === 'resolution' ? 'RESOLVED' : type.toUpperCase();

        let message = `${emoji} **${typeText}**: ${alert.title}\n\n`;
        message += `**Level**: ${alert.level.toUpperCase()}\n`;
        message += `**Category**: ${alert.category}\n`;
        message += `**Time**: ${alert.timestamp.toISOString()}\n`;
        message += `**Description**: ${alert.description}\n`;

        if (alert.metrics && Object.keys(alert.metrics).length > 0) {
            message += `\n**Metrics**:\n`;
            for (const [category, metrics] of Object.entries(alert.metrics)) {
                if (metrics && typeof metrics === 'object') {
                    message += `- ${category}: ${JSON.stringify(metrics, null, 2)}\n`;
                }
            }
        }

        if (type === 'resolution' && alert.resolvedAt) {
            message += `\n**Resolved At**: ${alert.resolvedAt.toISOString()}\n`;
            if (alert.acknowledgedBy) {
                message += `**Resolved By**: ${alert.acknowledgedBy}\n`;
            }
        }

        return message;
    }

    /**
     * Get emoji for alert level
     */
    private getAlertEmoji(level: string): string {
        const emojis = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            critical: '🚨'
        };
        return emojis[level as keyof typeof emojis] || '📢';
    }

    /**
     * Send email notification
     */
    private async sendEmailNotification(
        alert: Alert,
        channel: NotificationChannel,
        message: string
    ): Promise<void> {
        // Simulated email sending - in real implementation use nodemailer
        logger.info(`EMAIL to ${channel.config.to}: ${message}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Send Slack notification
     */
    private async sendSlackNotification(
        alert: Alert,
        channel: NotificationChannel,
        message: string
    ): Promise<void> {
        // Simulated Slack sending - in real implementation use Slack API
        logger.info(`SLACK to ${channel.config.channel}: ${message}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Send webhook notification
     */
    private async sendWebhookNotification(
        alert: Alert,
        channel: NotificationChannel,
        message: string
    ): Promise<void> {
        if (channel.config.url === 'console') {
            // Special case for console logging
            console.log(`🔔 ALERT NOTIFICATION:\n${message}`);
            return;
        }

        // Simulated webhook sending - in real implementation use fetch/axios
        logger.info(`WEBHOOK to ${channel.config.url}: ${message}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Send Telegram notification
     */
    private async sendTelegramNotification(
        alert: Alert,
        channel: NotificationChannel,
        message: string
    ): Promise<void> {
        // Simulated Telegram sending - in real implementation use Telegram Bot API
        logger.info(`TELEGRAM to ${channel.config.chatId}: ${message}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Send SMS notification
     */
    private async sendSMSNotification(
        alert: Alert,
        channel: NotificationChannel,
        message: string
    ): Promise<void> {
        // Simulated SMS sending - in real implementation use Twilio/AWS SNS
        logger.info(`SMS to ${channel.config.phoneNumber}: ${message}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Setup escalation for alert
     */
    private setupEscalation(alert: Alert): void {
        const escalationRule = Array.from(this.escalationRules.values())
            .find(rule => rule.enabled && rule.alertLevel === alert.level);

        if (!escalationRule) {
            return;
        }

        const timer = setTimeout(async () => {
            logger.warn(`AlertingService: Escalating alert ${alert.id} after ${escalationRule.timeThreshold}ms`);

            // Send escalation notifications
            for (const channelId of escalationRule.escalationChannels) {
                const channel = this.notificationChannels.get(channelId);
                if (channel && channel.enabled) {
                    try {
                        await this.sendNotification(alert, channel, 'escalation');
                    } catch (error) {
                        logger.error(`AlertingService: Failed to send escalation notification to ${channel.name}:`, error);
                    }
                }
            }

            this.escalationTimers.delete(alert.id);
            this.emit('alertEscalated', alert, escalationRule);
        }, escalationRule.timeThreshold);

        this.escalationTimers.set(alert.id, timer);
    }

    /**
     * Start retry mechanism for failed notifications
     */
    private startRetryMechanism(): void {
        this.retryTimer = setInterval(() => {
            this.retryFailedNotifications();
        }, 60000); // Retry every minute
    }

    /**
     * Retry failed notifications
     */
    private async retryFailedNotifications(): Promise<void> {
        const failedNotifications = Array.from(this.notifications.values())
            .filter(notification =>
                notification.status === 'failed' &&
                notification.attempts < 3 &&
                (!notification.lastAttempt || Date.now() - notification.lastAttempt.getTime() > 300000) // 5 minutes
            );

        for (const notification of failedNotifications) {
            const alert = performanceMonitor.getActiveAlerts()
                .find(a => a.id === notification.alertId);

            const channel = this.notificationChannels.get(notification.channelId);

            if (alert && channel) {
                try {
                    notification.status = 'retrying';
                    await this.deliverNotification(alert, channel, 'alert', notification);
                    notification.status = 'sent';
                    logger.info(`AlertingService: Retry successful for notification ${notification.id}`);
                } catch (error) {
                    notification.status = 'failed';
                    notification.error = error instanceof Error ? error.message : String(error);
                    logger.error(`AlertingService: Retry failed for notification ${notification.id}:`, error);
                }
            }
        }
    }

    /**
     * Add notification channel
     */
    addNotificationChannel(channel: NotificationChannel): void {
        this.notificationChannels.set(channel.id, channel);
        logger.info(`AlertingService: Added notification channel ${channel.id}: ${channel.name}`);
        this.emit('channelAdded', channel);
    }

    /**
     * Remove notification channel
     */
    removeNotificationChannel(channelId: string): boolean {
        const removed = this.notificationChannels.delete(channelId);
        if (removed) {
            logger.info(`AlertingService: Removed notification channel ${channelId}`);
            this.emit('channelRemoved', channelId);
        }
        return removed;
    }

    /**
     * Add escalation rule
     */
    addEscalationRule(rule: EscalationRule): void {
        this.escalationRules.set(rule.id, rule);
        logger.info(`AlertingService: Added escalation rule ${rule.id}: ${rule.name}`);
        this.emit('escalationRuleAdded', rule);
    }

    /**
     * Remove escalation rule
     */
    removeEscalationRule(ruleId: string): boolean {
        const removed = this.escalationRules.delete(ruleId);
        if (removed) {
            logger.info(`AlertingService: Removed escalation rule ${ruleId}`);
            this.emit('escalationRuleRemoved', ruleId);
        }
        return removed;
    }

    /**
     * Get notification channels
     */
    getNotificationChannels(): NotificationChannel[] {
        return Array.from(this.notificationChannels.values());
    }

    /**
     * Get escalation rules
     */
    getEscalationRules(): EscalationRule[] {
        return Array.from(this.escalationRules.values());
    }

    /**
     * Get notification history
     */
    getNotificationHistory(limit?: number): AlertNotification[] {
        const notifications = Array.from(this.notifications.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return limit ? notifications.slice(0, limit) : notifications;
    }

    /**
     * Test notification channel
     */
    async testNotificationChannel(channelId: string): Promise<boolean> {
        const channel = this.notificationChannels.get(channelId);
        if (!channel) {
            throw new Error(`Notification channel ${channelId} not found`);
        }

        const testAlert: Alert = {
            id: 'test-alert',
            timestamp: new Date(),
            level: 'info',
            category: 'system',
            title: 'Test Alert',
            description: 'This is a test alert to verify notification channel configuration',
            metrics: {},
            resolved: false
        };

        try {
            await this.sendNotification(testAlert, channel, 'alert');
            logger.info(`AlertingService: Test notification sent successfully to ${channel.name}`);
            return true;
        } catch (error) {
            logger.error(`AlertingService: Test notification failed for ${channel.name}:`, error);
            return false;
        }
    }

    private generateNotificationId(): string {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
            this.retryTimer = undefined;
        }

        // Clear all escalation timers
        for (const timer of this.escalationTimers.values()) {
            clearTimeout(timer);
        }
        this.escalationTimers.clear();

        this.isInitialized = false;
        logger.info('AlertingService: Destroyed');
    }
}

// Export singleton instance
export const alertingService = new AlertingService();