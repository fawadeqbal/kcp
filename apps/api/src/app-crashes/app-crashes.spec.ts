import { scrubCrashText } from './app-crashes.service.js';

describe('crash report scrubbing', () => {
  it('takes out anything that could name a person', () => {
    const text = scrubCrashText(
      'Failed for sara@example.com: Bearer eyJhbGciOiJIUzI1NiJ9abc.def token=abc123 ' +
        'GET https://api.example.com/v1/learning?lang=ur&x=1 id 0193a4b2c8d94e6f8a1b2c3d4e5f6a7b8 phone 03001234567',
    );
    expect(text).not.toMatch(/sara|eyJ|abc123|lang=ur|0193a4b2|03001234567/);
    expect(text).toContain('[email]');
    expect(text).toContain('https://api.example.com/v1/learning?[query]');
  });

  it('keeps stack frames readable', () => {
    const frame =
      '#0 _LessonPlayerScreenStateWithAnimations.build (package:kcp_app/features/lesson/lesson_player_screen.dart:123:45)';
    expect(scrubCrashText(frame)).toBe(frame);
  });
});
