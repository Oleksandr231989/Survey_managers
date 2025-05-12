const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Request received in API');
    
    // Get Supabase credentials 
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Supabase URL present:', !!supabaseUrl);
    console.log('Supabase Key present:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials' });
    }
    
    // Test Supabase connection first
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Simple test query to verify connection
    try {
      const { data: testData, error: testError } = await supabase
        .from('managers_survey_responses')
        .select('count', { count: 'exact', head: true });
        
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        return res.status(500).json({ error: 'Supabase connection failed: ' + testError.message });
      }
      
      console.log('Supabase connection successful');
    } catch (connError) {
      console.error('Supabase connection error:', connError);
      return res.status(500).json({ error: 'Supabase connection error: ' + connError.message });
    }
    
    // Ensure we have a valid request body
    if (!req.body) {
      return res.status(400).json({ error: 'Missing request body' });
    }
    
    // Log request body
    try {
      console.log('Request body:', typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    } catch (e) {
      console.log('Could not stringify request body');
    }
    
    // Get form data from request body
    const {
      country,
      q1, // satisfaction_performance
      q2, // strengths_performance
      q3, // improvement_recommendations_performance
      q4, // faced_challenges
      q5, // main_challenge
      q6, // support_assessment
      q7, // manager_discussion_quality
      q8, // received_useful_feedback
      q9, // feedback_reason
      q10, // satisfaction_compensation
      q11, // strengths_compensation
      q12, // strengths_details
      q13, // improvement_area_compensation
      q14, // improvement_recommendations_compensation
      q15  // workday_experience
    } = req.body;
    
    // Validate required fields
    if (!country || !q1 || !q2 || !q3 || q4 === undefined || 
        !q6 || !q7 || q8 === undefined || !q10 || !q11 || 
        !q12 || !q13 || !q15) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Transform data to match database schema
    const insertData = {
      country,
      satisfaction_performance: q1,
      strengths_performance: q2,
      improvement_recommendations_performance: q3,
      faced_challenges: q4 === 'Yes',
      main_challenge: q4 === 'Yes' ? q5 : null,
      support_assessment: q6,
      manager_discussion_quality: q7,
      received_useful_feedback: q8 === 'Yes',
      feedback_reason: q8 === 'Yes' ? q9 : null,
      satisfaction_compensation: q10,
      strengths_compensation: q11,
      strengths_details: q12,
      improvement_area_compensation: q13,
      improvement_recommendations_compensation: q14,
      workday_experience: q15,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    };
    
    console.log('Data to insert:', JSON.stringify(insertData));
    
    // Insert data into Supabase
    try {
      console.log('Attempting to insert data...');
      const { data, error } = await supabase
        .from('managers_survey_responses')
        .insert([insertData]);
      
      if (error) {
        console.error('Supabase error:', JSON.stringify(error));
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      
      console.log('Data inserted successfully');
      return res.status(200).json({ success: true });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return res.status(500).json({ error: 'Database operation failed: ' + dbError.message });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};
