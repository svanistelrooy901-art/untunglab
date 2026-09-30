// Shared browser helper for the mandatory Kos Operasi rule (D-70).
/**
 * Kos Operasi is mandatory (D-70). Fills every category that is still blank with "Tiada kos ini (RM0)" through the
 * real screen. Safe to call more than once.
 */
export async function fillRemainingOperating(page, url) {
  await page.goto(url + '#/kos-operasi');
  await page.getByTestId('ops-kemajuan').waitFor();
  for (let guard = 0; guard < 8; guard++) {
    const todo = page.getByRole('button', { name: /\+ Isi/ });
    if ((await todo.count()) === 0) break;
    await todo.first().click();
    await page.getByRole('button', { name: 'Tiada kos ini (RM0)' }).click();
    await page.getByRole('button', { name: 'Tiada kos ini (RM0)' }).waitFor({ state: 'detached' });
  }
}
