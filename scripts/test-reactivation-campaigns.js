#!/usr/bin/env node

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'zabardoo_bot',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function testReactivationCampaigns() {
  console.log('🧪 Testing Reactivation Campaign System...\n');

  try {
    // Test 1: Create retention campaign
    console.log('1️⃣ Testing retention campaign creation...');
    const retentionCampaignResult = await pool.query(`
      INSERT INTO retention_campaigns (
        name, description, campaign_type, status, target_segment, triggers,
        actions, schedule, budget, start_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      'At-Risk User Reactivation Campaign',
      'Automated campaign to reactivate users showing signs of churn risk',
      'reactive',
      'active',
      JSON.stringify({
        segmentType: 'churn_risk',
        criteria: [
          {
            field: 'churn_risk_score',
            operator: 'greater_than',
            value: 60,
            logicalOperator: 'AND'
          },
          {
            field: 'days_since_last_activity',
            operator: 'greater_than',
            value: 7,
            logicalOperator: 'AND'
          },
          {
            field: 'lifetime_value',
            operator: 'greater_than',
            value: 1000,
            logicalOperator: 'AND'
          }
        ],
        estimatedSize: 200,
        refreshFrequency: 'daily'
      }),
      JSON.stringify([
        {
          triggerType: 'score_based',
          conditions: [
            {
              field: 'churn_risk_score',
              operator: 'greater_than',
              value: 60,
              timeWindow: 1440
            }
          ],
          frequency: 'once',
          cooldownPeriod: 168
        }
      ]),
      JSON.stringify([
        {
          actionType: 'send_message',
          parameters: {
            channel: 'telegram',
            template: 'reactivation_discount',
            content: 'We miss you! Here\'s an exclusive 20% discount on your next purchase. Valid for 7 days only!',
            offerDetails: {
              offerType: 'percentage_discount',
              value: 20,
              currency: 'INR',
              validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              conditions: ['minimum_order_500'],
              redemptionLimit: 1
            }
          },
          delay: 0,
          conditions: []
        },
        {
          actionType: 'schedule_followup',
          parameters: {
            followupType: 'reminder',
            delay: 2880,
            template: 'discount_reminder',
            content: 'Don\'t forget! Your exclusive 20% discount expires in 2 days. Use code: COMEBACK20'
          },
          delay: 2880,
          conditions: [
            {
              field: 'message_opened',
              operator: 'equals',
              value: false
            }
          ]
        },
        {
          actionType: 'assign_tag',
          parameters: {
            tags: ['reactivation_campaign_2024', 'at_risk_user'],
            removeAfterDays: 30
          },
          delay: 0
        }
      ]),
      JSON.stringify({
        scheduleType: 'immediate',
        timez