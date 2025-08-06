#!/usr/bin/env node

const { FunnelAnalysisService } = require('../src/services/analytics/FunnelAnalysisService');
const { CohortAnalysisService } = require('../src/services/analytics/CohortAnalysisService');
const { UserSegmentationService } = require('../src/services/analytics/UserSegmentationService');
const { CohortType, UserAction } = require('../src/models/Analytics');

async function testFunnelCohortAnalysis() {
  console.log('📊 Testing Funnel & Cohort Analysis System...\n');

  const funnelService = new FunnelAnalysisService();
  const cohortService = new CohortAnalysisService();
  const segmentationService = new UserSegmentationService();

  try {
    // Test 1: Funnel Analysis
    console.log('1️⃣ Test: Funnel Analysis');
    
    // Create purchase funnel
    const purchaseFunnelConfig = {
      name: 'E-commerce Purchase Funnel',
      description: 'Complete user journey from coupon view to purchase',
      steps: [
        { name: 'Coupon View', eventName: 'coupon_view', isRequired: true },
        { name: 'Coupon Click', eventName: 'coupon_click', isRequired: true },
        { name: 'Store Visit', eventName: 'store_visit', isRequired: true },
        { name: 'Add to Cart', eventName: 'add_to_cart', isRequired: false },
        { name: 'Purchase Initiated', eventName: 'purchase_initiated', isRequired: true },
        { name: 'Purchase Completed', eventName: 'purchase_completed', isRequired: true }
      ],
      timeWindow: 24 // 24 hours
    };

    const purchaseFunnel = await funnelService.createFunnel(purchaseFunnelConfig);
    console.log('✅ Purchase funnel created:', {
      id: purchaseFunnel.id,
      name: purchaseFunnel.name,
      steps: purchaseFunnel.steps.length,
      timeWindow: purchaseFunnel.timeWindow
    });

    // Create cashback funnel
    const cashbackFunnelConfig = {
      name: 'Cashback Earning Funnel',
      description: 'From purchase to cashback withdrawal',
      steps: [
        { name: 'Purchase Completed', eventName: 'purchase_completed', isRequired: true },
        { name: 'Cashback Earned', eventName: 'cashback_earned', isRequired: true },
        { name: 'Payment Method Added', eventName: 'payment_method_added', isRequired: false },
        { name: 'Cashback Withdrawn', eventName: 'cashback_withdrawn', isRequired: true }
      ],
      timeWindow: 168 // 7 days
    };

    const cashbackFunnel = await funnelService.createFunnel(cashbackFunnelConfig);
    console.log('✅ Cashback funnel created:', {
      id: cashbackFunnel.id,
      name: cashbackFunnel.name,
      steps: cashbackFunnel.steps.length
    });

    // Test 2: Funnel Analysis
    console.log('\n2️⃣ Test: Funnel Performance Analysis');
    
    const dateRange = {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    };

    const purchaseAnalysis = await funnelService.analyzeFunnel(purchaseFunnel.id, dateRange);
    console.log('✅ Purchase funnel analysis:', {
      totalUsers: purchaseAnalysis.totalUsers,
      conversionRate: (purchaseAnalysis.conversionRate * 100).toFixed(2) + '%',
      stepsAnalyzed: purchaseAnalysis.steps.length,
      dropoffPoints: purchaseAnalysis.dropoffPoints.length
    });

    // Display step-by-step analysis
    console.log('\n📊 Step-by-step conversion rates:');
    purchaseAnalysis.steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.stepName}: ${step.usersEntered} → ${step.usersCompleted} (${(step.conversionRate * 100).toFixed(1)}%)`);
    });

    // Display dropoff points
    if (purchaseAnalysis.dropoffPoints.length > 0) {
      console.log('\n⚠️ Major dropoff points:');
      purchaseAnalysis.dropoffPoints.slice(0, 3).forEach(dropoff => {
        console.log(`   ${dropoff.fromStep} → ${dropoff.toStep}: ${(dropoff.dropoffRate * 100).toFixed(1)}% dropoff`);
      });
    }

    // Test 3: Funnel Insights
    console.log('\n3️⃣ Test: Funnel Insights & Recommendations');
    
    const insights = await funnelService.getFunnelInsights(purchaseFunnel.id, dateRange);
    console.log('✅ Funnel insights generated:', {
      overallConversionRate: (insights.overallConversionRate * 100).toFixed(2) + '%',
      biggestDropoffStep: insights.biggestDropoffStep,
      dropoffRate: (insights.dropoffRate * 100).toFixed(1) + '%',
      avgTimeToConvert: Math.round(insights.averageTimeToConvert / 1000) + ' seconds'
    });

    console.log('\n💡 Top performing segments:');
    insights.topPerformingSegments.forEach(segment => {
      console.log(`   ${segment.segment}: ${(segment.conversionRate * 100).toFixed(1)}% (${segment.userCount} users)`);
    });

    console.log('\n📝 Recommendations:');
    insights.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Test 4: Funnel Comparison
    console.log('\n4️⃣ Test: Funnel Performance Comparison');
    
    const currentPeriod = {
      from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Last 2 weeks
      to: new Date()
    };
    
    const previousPeriod = {
      from: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // Previous 2 weeks
      to: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    };

    const comparison = await funnelService.compareFunnelPerformance(
      purchaseFunnel.id,
      currentPeriod,
      previousPeriod
    );

    console.log('✅ Funnel comparison completed:');
    console.log(`   Current period conversion: ${(comparison.current.conversionRate * 100).toFixed(2)}%`);
    console.log(`   Previous period conversion: ${(comparison.previous.conversionRate * 100).toFixed(2)}%`);

    console.log('\n📈 Step-by-step changes:');
    comparison.changes.forEach(change => {
      const changeIcon = change.trend === 'improved' ? '📈' : change.trend === 'declined' ? '📉' : '➡️';
      console.log(`   ${changeIcon} ${change.step}: ${(change.conversionRateChange * 100).toFixed(2)}% change`);
    });

    // Test 5: Cohort Analysis
    console.log('\n5️⃣ Test: Cohort Analysis');
    
    // User retention cohorts
    const retentionAnalysis = await cohortService.analyzeRetentionCohorts(
      {
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        to: new Date()
      },
      'week',
      12
    );

    console.log('✅ Retention cohort analysis:', {
      analysisId: retentionAnalysis.id,
      cohortType: retentionAnalysis.cohortType,
      cohortsCount: retentionAnalysis.cohorts.length,
      periodsAnalyzed: retentionAnalysis.averageRetention.length
    });

    // Display retention matrix
    console.log('\n📊 Average retention rates by period:');
    retentionAnalysis.averageRetention.forEach((rate, index) => {
      console.log(`   Week ${index}: ${(rate * 100).toFixed(1)}%`);
    });

    // Revenue cohorts
    const revenueAnalysis = await cohortService.analyzeRevenueCohorts(
      {
        from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
        to: new Date()
      }
    );

    console.log('✅ Revenue cohort analysis:', {
      analysisId: revenueAnalysis.id,
      cohortType: revenueAnalysis.cohortType,
      cohortsCount: revenueAnalysis.cohorts.length
    });

    // Test 6: Cohort Insights
    console.log('\n6️⃣ Test: Cohort Insights');
    
    const cohortInsights = await cohortService.getCohortInsights(retentionAnalysis);
    console.log('✅ Cohort insights generated:', {
      bestPerformingCohort: cohortInsights.bestPerformingCohort,
      worstPerformingCohort: cohortInsights.worstPerformingCohort,
      retentionTrend: cohortInsights.retentionTrend
    });

    console.log('\n🔍 Key insights:');
    cohortInsights.keyInsights.forEach((insight, index) => {
      console.log(`   ${index + 1}. ${insight}`);
    });

    console.log('\n💡 Recommendations:');
    cohortInsights.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Test 7: Cohort Comparison
    console.log('\n7️⃣ Test: Cohort Comparison');
    
    const mobileConfig = {
      name: 'Mobile Users Retention',
      cohortType: CohortType.ACQUISITION,
      acquisitionEvent: UserAction.BOT_START,
      retentionEvent: 'any_activity',
      timeUnit: 'week',
      periods: 8,
      filters: { userProperties: { platform: 'mobile' } }
    };

    const desktopConfig = {
      name: 'Desktop Users Retention',
      cohortType: CohortType.ACQUISITION,
      acquisitionEvent: UserAction.BOT_START,
      retentionEvent: 'any_activity',
      timeUnit: 'week',
      periods: 8,
      filters: { userProperties: { platform: 'desktop' } }
    };

    const cohortComparison = await cohortService.compareCohorts(
      mobileConfig,
      desktopConfig,
      {
        from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    );

    console.log('✅ Cohort comparison completed:');
    console.log(`   Mobile cohorts: ${cohortComparison.cohort1.cohorts.length}`);
    console.log(`   Desktop cohorts: ${cohortComparison.cohort2.cohorts.length}`);

    console.log('\n📊 Retention differences by period:');
    cohortComparison.retentionDifference.forEach((diff, index) => {
      const diffIcon = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
      console.log(`   Week ${index}: ${diffIcon} ${(diff * 100).toFixed(1)}% difference`);
    });

    // Test 8: User Segmentation
    console.log('\n8️⃣ Test: User Segmentation');
    
    // Create predefined segments
    const predefinedSegments = await segmentationService.createPredefinedSegments();
    console.log('✅ Predefined segments created:', {
      count: predefinedSegments.length,
      segments: predefinedSegments.map(s => s.name)
    });

    // Create custom segment
    const customSegmentCriteria = [
      {
        type: 'behavior',
        field: 'total_purchases',
        operator: 'gte',
        value: 3,
        timeframe: { period: 3, unit: 'months' }
      },
      {
        type: 'behavior',
        field: 'total_spent',
        operator: 'gte',
        value: 2000
      }
    ];

    const customSegment = await segmentationService.createSegment(
      'High Value Customers',
      'Customers with multiple purchases and high spending',
      customSegmentCriteria
    );

    console.log('✅ Custom segment created:', {
      id: customSegment.id,
      name: customSegment.name,
      userCount: customSegment.userCount,
      criteriaCount: customSegment.criteria.length
    });

    // Test 9: Segment Analysis
    console.log('\n9️⃣ Test: Segment Analysis');
    
    const segmentAnalysis = await segmentationService.analyzeSegment(
      customSegment.id,
      {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    );

    console.log('✅ Segment analysis completed:', {
      segmentName: segmentAnalysis.segment.name,
      totalUsers: segmentAnalysis.metrics.totalUsers,
      activeUsers: segmentAnalysis.metrics.activeUsers,
      conversionRate: (segmentAnalysis.metrics.conversionRate * 100).toFixed(2) + '%',
      avgRevenuePerUser: '₹' + segmentAnalysis.metrics.averageRevenuePerUser.toFixed(2),
      retentionRate: (segmentAnalysis.metrics.retentionRate * 100).toFixed(1) + '%'
    });

    console.log('\n🔥 Top events in segment:');
    segmentAnalysis.topEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.eventName}: ${event.count} events (${event.uniqueUsers} users)`);
    });

    console.log('\n🎯 Behavior patterns:');
    segmentAnalysis.behaviorPatterns.forEach((pattern, index) => {
      console.log(`   ${index + 1}. ${pattern}`);
    });

    // Test 10: Segment Comparison
    console.log('\n🔟 Test: Segment Comparison');
    
    // Compare high value customers with new users
    const newUsersSegment = predefinedSegments.find(s => s.name === 'New Users');
    const highValueSegment = predefinedSegments.find(s => s.name === 'High Value Users');

    if (newUsersSegment && highValueSegment) {
      const segmentComparison = await segmentationService.compareSegments(
        [newUsersSegment.id, highValueSegment.id],
        {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date()
        }
      );

      console.log('✅ Segment comparison completed:', {
        segmentsCompared: segmentComparison.segments.map(s => s.name),
        metricsAnalyzed: segmentComparison.metrics.length
      });

      console.log('\n📊 Key metric comparisons:');
      segmentComparison.metrics.slice(0, 5).forEach(metric => {
        console.log(`   ${metric.metric}:`);
        console.log(`     Best: ${metric.bestPerforming} (${metric.values[segmentComparison.segments.findIndex(s => s.name === metric.bestPerforming)]})`);
        console.log(`     Worst: ${metric.worstPerforming} (${metric.values[segmentComparison.segments.findIndex(s => s.name === metric.worstPerforming)]})`);
      });

      console.log('\n💡 Comparison insights:');
      segmentComparison.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. ${insight}`);
      });
    }

    // Test 11: Segment Recommendations
    console.log('\n1️⃣1️⃣ Test: Segment Recommendations');
    
    const recommendations = await segmentationService.getSegmentRecommendations(customSegment.id);
    
    console.log('✅ Segment recommendations generated:');
    
    console.log('\n🎯 Targeting recommendations:');
    recommendations.targetingRecommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    console.log('\n💬 Engagement strategies:');
    recommendations.engagementStrategies.forEach((strategy, index) => {
      console.log(`   ${index + 1}. ${strategy}`);
    });

    console.log('\n🔄 Conversion optimizations:');
    recommendations.conversionOptimizations.forEach((opt, index) => {
      console.log(`   ${index + 1}. ${opt}`);
    });

    // Test 12: Integration Test
    console.log('\n1️⃣2️⃣ Test: Integration Analysis');
    
    console.log('Testing integrated funnel and cohort analysis...');
    
    // Analyze funnel performance by cohort
    const funnelSegmentation = await funnelService.segmentFunnelAnalysis(
      purchaseFunnel.id,
      dateRange,
      'platform'
    );

    console.log('✅ Funnel segmentation by platform:', {
      segmentsAnalyzed: funnelSegmentation.length,
      segments: funnelSegmentation.map(s => ({
        segment: s.segment,
        users: s.userCount,
        conversion: (s.analysis.conversionRate * 100).toFixed(1) + '%'
      }))
    });

    // Cross-reference with cohort data
    console.log('\n🔗 Cross-referencing with cohort retention data...');
    
    const platformCohorts = await Promise.all(
      ['mobile', 'desktop'].map(async platform => {
        const config = {
          name: `${platform} Retention`,
          cohortType: CohortType.ACQUISITION,
          acquisitionEvent: UserAction.BOT_START,
          retentionEvent: 'any_activity',
          timeUnit: 'week',
          periods: 4,
          filters: { userProperties: { platform } }
        };
        
        return await cohortService.createCohortAnalysis(config, {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date()
        });
      })
    );

    console.log('✅ Platform-specific cohort analysis:', {
      platforms: platformCohorts.map(c => ({
        name: c.name,
        cohorts: c.cohorts.length,
        avgRetention: (c.averageRetention[0] * 100).toFixed(1) + '%'
      }))
    });

    console.log('\n🎉 All Funnel & Cohort Analysis tests completed successfully!');

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('✅ Funnel creation and configuration');
    console.log('✅ Funnel performance analysis');
    console.log('✅ Funnel insights and recommendations');
    console.log('✅ Funnel performance comparison');
    console.log('✅ Cohort analysis (retention & revenue)');
    console.log('✅ Cohort insights generation');
    console.log('✅ Cohort comparison across segments');
    console.log('✅ User segmentation and analysis');
    console.log('✅ Segment comparison and recommendations');
    console.log('✅ Integration analysis');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Performance Test: Large Scale Analysis');
  
  const funnelService = new FunnelAnalysisService();
  const cohortService = new CohortAnalysisService();
  
  try {
    console.log('Testing performance with large datasets...');
    
    // Create multiple funnels
    const startTime = Date.now();
    const funnelPromises = [];
    
    for (let i = 0; i < 10; i++) {
      funnelPromises.push(
        funnelService.createFunnel({
          name: `Performance Test Funnel ${i}`,
          steps: [
            { name: 'Start', eventName: `start_${i}`, isRequired: true },
            { name: 'Middle', eventName: `middle_${i}`, isRequired: true },
            { name: 'End', eventName: `end_${i}`, isRequired: true }
          ],
          timeWindow: 24
        })
      );
    }
    
    const funnels = await Promise.all(funnelPromises);
    const funnelCreationTime = Date.now() - startTime;
    
    console.log(`✅ Created ${funnels.length} funnels in ${funnelCreationTime}ms`);
    
    // Analyze funnels concurrently
    const analysisStartTime = Date.now();
    const analysisPromises = funnels.map(funnel => 
      funnelService.analyzeFunnel(funnel.id, {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      })
    );
    
    const analyses = await Promise.all(analysisPromises);
    const analysisTime = Date.now() - analysisStartTime;
    
    console.log(`✅ Analyzed ${analyses.length} funnels in ${analysisTime}ms`);
    console.log(`⚡ Average analysis time: ${(analysisTime / analyses.length).toFixed(2)}ms per funnel`);
    
    // Test cohort analysis performance
    const cohortStartTime = Date.now();
    const cohortAnalysis = await cohortService.analyzeRetentionCohorts({
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date()
    }, 'week', 12);
    const cohortTime = Date.now() - cohortStartTime;
    
    console.log(`✅ Cohort analysis completed in ${cohortTime}ms`);
    console.log(`📊 Analyzed ${cohortAnalysis.cohorts.length} cohorts with ${cohortAnalysis.averageRetention.length} periods`);
    
  } catch (error) {
    console.log('❌ Performance test failed:', error.message);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testFunnelCohortAnalysis()
    .then(() => performanceTest())
    .then(() => {
      console.log('\n🏁 All funnel and cohort analysis tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testFunnelCohortAnalysis, performanceTest };