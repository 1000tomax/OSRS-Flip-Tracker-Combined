// Cloudflare Worker Function for feedback submission
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'content-type': 'text/plain' },
    });
  }

  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Discord webhook not configured');
    return new Response(JSON.stringify({ success: false, message: 'Webhook not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const feedbackData = await request.json();

    // Validate required fields
    if (!feedbackData.feedback_text || !feedbackData.feedback_text.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'Feedback text is required' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Determine user type
    const userType = feedbackData.isOwner
      ? '👑 Owner'
      : `👤 ${feedbackData.sessionId || 'Unknown Session'}`;

    const embed = {
      title: '💬 AI Query Feedback',
      color: feedbackData.isOwner ? 0x00ff00 : 0xffa500, // Green for owner, orange for users
      fields: [
        {
          name: '👤 Session',
          value: userType,
          inline: true,
        },
        {
          name: '📝 Original Query',
          value: `\`\`\`${feedbackData.user_query ? feedbackData.user_query.substring(0, 500) : 'N/A'}\`\`\``,
          inline: false,
        },
        {
          name: '🔍 Generated SQL',
          value: `\`\`\`sql\n${feedbackData.generated_sql ? feedbackData.generated_sql.substring(0, 500) : 'N/A'}\n\`\`\``,
          inline: false,
        },
        {
          name: '💭 User Feedback',
          value: `\`\`\`${feedbackData.feedback_text.substring(0, 1000)}${feedbackData.feedback_text.length > 1000 ? '...' : ''}\`\`\``,
          inline: false,
        },
        {
          name: '📊 Results Count',
          value: feedbackData.results_count?.toString() || '0',
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: feedbackData.isOwner
          ? 'OSRS AI Feedback - Owner'
          : `OSRS AI Feedback - ${feedbackData.sessionId || 'Anonymous'}`,
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.log('Feedback sent to Discord successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Feedback submission error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to submit feedback',
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
