'use client';

import { Button } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <Button
      variant="subtle"
      color="gray"
      size="xs"
      leftSection={<IconLogout size={16} />}
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      로그아웃
    </Button>
  );
}
