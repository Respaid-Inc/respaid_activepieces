import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { Trash, Mail, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { INTERNAL_ERROR_TOAST, useToast } from '@/components/ui/use-toast';
import { alertsApi } from '@/features/alerts/lib/alerts-api';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { Alert, AlertChannel } from '@activepieces/ee-shared';
import { Permission } from '@activepieces/shared';

import { AddAlertEmailDialog } from './add-alert-email-dialog';
import { AddAlertSlackDialog } from './add-alert-slack-dialog';

const fetchData = async () => {
  const page = await alertsApi.list({
    projectId: authenticationSession.getProjectId()!,
    limit: 100,
  });
  return page.data;
};

export default function AlertsEmailsCard() {
  const { toast } = useToast();
  const { data, isLoading, isError, isSuccess, refetch } = useQuery<
    Alert[],
    Error,
    Alert[]
  >({
    queryKey: ['alerts-email-list'],
    queryFn: fetchData,
  });
  const { checkAccess } = useAuthorization();
  const writeAlertPermission = checkAccess(Permission.WRITE_ALERT);
  const deleteMutation = useMutation<void, Error, Alert>({
    mutationFn: (alert) => alertsApi.delete(alert.id),
    onSuccess: () => {
      refetch();
      toast({
        title: t('Success'),
        description: t('Your changes have been saved.'),
        duration: 3000,
      });
    },
    onError: (error) => {
      toast(INTERNAL_ERROR_TOAST);
      console.log(error);
    },
  });

  const formatReceiver = (alert: Alert) => {
    if (alert.channel === AlertChannel.SLACK) {
      // Show truncated webhook URL for Slack
      const url = alert.receiver;
      if (url.length > 50) {
        return url.substring(0, 47) + '...';
      }
      return url;
    }
    return alert.receiver;
  };

  const getChannelIcon = (channel: AlertChannel) => {
    switch (channel) {
      case AlertChannel.SLACK:
        return <MessageSquare className="size-4 text-muted-foreground" />;
      case AlertChannel.EMAIL:
      default:
        return <Mail className="size-4 text-muted-foreground" />;
    }
  };

  const getChannelLabel = (channel: AlertChannel) => {
    switch (channel) {
      case AlertChannel.SLACK:
        return t('Slack');
      case AlertChannel.EMAIL:
      default:
        return t('Email');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('Alert Recipients')}</CardTitle>
        <CardDescription>
          {t('Add email addresses or Slack webhooks to receive alerts.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="min-h-[35px]">
          {isLoading && (
            <div className="flex items-center justify-center">
              <LoadingSpinner />
            </div>
          )}
          {isError && <div>{t('Error, please try again.')}</div>}
          {isSuccess && data.length === 0 && (
            <div className="text-center">{t('No alert recipients added yet.')}</div>
          )}
          {Array.isArray(data) &&
            data.map((alert: Alert) => (
              <div
                className="flex items-center justify-between space-x-4 py-2"
                key={alert.id}
              >
                <div className="flex items-center space-x-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center">
                        {getChannelIcon(alert.channel)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {getChannelLabel(alert.channel)}
                    </TooltipContent>
                  </Tooltip>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {formatReceiver(alert)}
                    </p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="ghost"
                        className="size-8 p-0"
                        onClick={() => deleteMutation.mutate(alert)}
                        disabled={writeAlertPermission === false}
                      >
                        <Trash className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {writeAlertPermission === false && (
                    <TooltipContent side="bottom">
                      {t('Only project admins can do this')}
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            ))}
        </div>
        <div className="flex flex-col gap-2">
          <AddAlertEmailDialog onAdd={() => refetch()} />
          <AddAlertSlackDialog onAdd={() => refetch()} />
        </div>
      </CardContent>
    </Card>
  );
}
