import { FastifyBaseLogger } from 'fastify'

export type SlackNotificationSender = {
    send: (args: SlackSendArgs) => Promise<void>
}

type SlackSendArgs = {
    webhookUrl: string
    message: SlackMessage
}

type SlackMessage = {
    text: string
    blocks?: SlackBlock[]
}

type SlackBlock = {
    type: string
    text?: {
        type: string
        text: string
        emoji?: boolean
    }
    elements?: SlackBlockElement[]
    accessory?: {
        type: string
        text?: {
            type: string
            text: string
            emoji?: boolean
        }
        url?: string
        action_id?: string
    }
}

type SlackBlockElement = {
    type: string
    text?: string
    url?: string
}

export const slackNotificationSender = (log: FastifyBaseLogger): SlackNotificationSender => {
    return {
        async send({ webhookUrl, message }) {
            log.info({
                name: '[SlackNotificationSender#send]',
                webhookUrl: webhookUrl.substring(0, 50) + '...',
                message: message.text,
            })

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(message),
                })

                if (!response.ok) {
                    const responseText = await response.text()
                    log.error({
                        name: '[SlackNotificationSender#send] Failed to send Slack notification',
                        status: response.status,
                        response: responseText,
                    })
                }
            }
            catch (error) {
                log.error({
                    name: '[SlackNotificationSender#send] Error sending Slack notification',
                    error,
                })
            }
        },
    }
}

export type IssueCreatedSlackMessageArgs = {
    flowName: string
    issueOrRunsPath: string
    isIssue: boolean
    createdAt: string
    platformName: string
}

export function buildIssueCreatedSlackMessage(args: IssueCreatedSlackMessageArgs): SlackMessage {
    const { flowName, issueOrRunsPath, isIssue, createdAt, platformName } = args

    const title = isIssue
        ? `:warning: New Issue in ${flowName}`
        : `:x: Flow Run Failed: ${flowName}`

    const description = isIssue
        ? `A new issue has been detected in your flow "${flowName}".`
        : `A flow run has failed for "${flowName}".`

    return {
        text: `${title} - ${description}`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: title,
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: description,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Flow:* ${flowName}\n*Time:* ${createdAt}`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `<${issueOrRunsPath}|View ${isIssue ? 'Issue' : 'Run'} Details>`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Sent by ${platformName}`,
                    },
                ],
            },
        ],
    }
}

export type IssuesReminderSlackMessageArgs = {
    issuesUrl: string
    issuesCount: number
    projectName: string
    platformName: string
    issues: Array<{
        flowDisplayName: string
        count: number
        created: string
        lastOccurrence: string
    }>
}

export function buildIssuesReminderSlackMessage(args: IssuesReminderSlackMessageArgs): SlackMessage {
    const { issuesUrl, issuesCount, projectName, platformName, issues } = args

    const issuesList = issues.slice(0, 10).map(issue =>
        `• *${issue.flowDisplayName}* - ${issue.count} occurrence(s), last: ${issue.lastOccurrence}`
    ).join('\n')

    const moreIssuesText = issuesCount > 10
        ? `\n_...and ${issuesCount - 10} more issues_`
        : ''

    return {
        text: `You have ${issuesCount} unresolved issue(s) in ${projectName}`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `:bell: Daily Issues Reminder for ${projectName}`,
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `You have *${issuesCount} unresolved issue(s)* that need attention:`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: issuesList + moreIssuesText,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `<${issuesUrl}|View All Issues>`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Sent by ${platformName}`,
                    },
                ],
            },
        ],
    }
}

export type TriggerFailureSlackMessageArgs = {
    flowName: string
    projectName: string
    platformName: string
}

export function buildTriggerFailureSlackMessage(args: TriggerFailureSlackMessageArgs): SlackMessage {
    const { flowName, projectName, platformName } = args

    return {
        text: `Trigger is failing for ${flowName} in ${projectName}`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `:rotating_light: Trigger Failure Alert`,
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `The trigger for flow *"${flowName}"* in project *${projectName}* is failing repeatedly.`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `Please check your flow configuration and ensure the trigger is properly set up.`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Sent by ${platformName}`,
                    },
                ],
            },
        ],
    }
}
