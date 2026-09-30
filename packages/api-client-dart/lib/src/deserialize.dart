import 'package:kcp_api/src/model/badge_counts_dto.dart';
import 'package:kcp_api/src/model/badge_dto.dart';
import 'package:kcp_api/src/model/badges_dto.dart';
import 'package:kcp_api/src/model/billing_dto.dart';
import 'package:kcp_api/src/model/board_week_dto.dart';
import 'package:kcp_api/src/model/certificate_dto.dart';
import 'package:kcp_api/src/model/certificate_list_dto.dart';
import 'package:kcp_api/src/model/challenge_dto.dart';
import 'package:kcp_api/src/model/child_certificates_dto.dart';
import 'package:kcp_api/src/model/child_consents_dto.dart';
import 'package:kcp_api/src/model/child_dto.dart';
import 'package:kcp_api/src/model/child_premium_dto.dart';
import 'package:kcp_api/src/model/code_files_dto.dart';
import 'package:kcp_api/src/model/consent_record_dto.dart';
import 'package:kcp_api/src/model/create_feedback_dto.dart';
import 'package:kcp_api/src/model/email_preferences_dto.dart';
import 'package:kcp_api/src/model/feedback_created_dto.dart';
import 'package:kcp_api/src/model/invoice_summary_dto.dart';
import 'package:kcp_api/src/model/language_dto.dart';
import 'package:kcp_api/src/model/leaderboard_dto.dart';
import 'package:kcp_api/src/model/leaderboard_dto_me.dart';
import 'package:kcp_api/src/model/leaderboard_entry_dto.dart';
import 'package:kcp_api/src/model/learning_overview_dto.dart';
import 'package:kcp_api/src/model/lesson_dto.dart';
import 'package:kcp_api/src/model/lesson_progress_dto.dart';
import 'package:kcp_api/src/model/lesson_summary_dto.dart';
import 'package:kcp_api/src/model/level_dto.dart';
import 'package:kcp_api/src/model/login_dto.dart';
import 'package:kcp_api/src/model/login_response_dto.dart';
import 'package:kcp_api/src/model/mark_badges_seen_dto.dart';
import 'package:kcp_api/src/model/mark_read_dto.dart';
import 'package:kcp_api/src/model/me_dto.dart';
import 'package:kcp_api/src/model/module_certificate_dto.dart';
import 'package:kcp_api/src/model/module_dto.dart';
import 'package:kcp_api/src/model/module_project_dto.dart';
import 'package:kcp_api/src/model/notification_dto.dart';
import 'package:kcp_api/src/model/notification_list_dto.dart';
import 'package:kcp_api/src/model/plan_option_dto.dart';
import 'package:kcp_api/src/model/practice_dto.dart';
import 'package:kcp_api/src/model/practice_progress_dto.dart';
import 'package:kcp_api/src/model/practice_quiz_dto.dart';
import 'package:kcp_api/src/model/premium_info_dto.dart';
import 'package:kcp_api/src/model/progress_dto.dart';
import 'package:kcp_api/src/model/quiz_answer_dto.dart';
import 'package:kcp_api/src/model/quiz_dto.dart';
import 'package:kcp_api/src/model/quiz_line_dto.dart';
import 'package:kcp_api/src/model/quiz_option_dto.dart';
import 'package:kcp_api/src/model/quiz_result_dto.dart';
import 'package:kcp_api/src/model/quiz_reveal_dto.dart';
import 'package:kcp_api/src/model/refresh_dto.dart';
import 'package:kcp_api/src/model/register_device_dto.dart';
import 'package:kcp_api/src/model/remove_device_dto.dart';
import 'package:kcp_api/src/model/report_crash_dto.dart';
import 'package:kcp_api/src/model/role_summary_dto.dart';
import 'package:kcp_api/src/model/season_dto.dart';
import 'package:kcp_api/src/model/streak_dto.dart';
import 'package:kcp_api/src/model/student_login_dto.dart';
import 'package:kcp_api/src/model/student_summary_dto.dart';
import 'package:kcp_api/src/model/subscription_dto.dart';
import 'package:kcp_api/src/model/today_dto.dart';
import 'package:kcp_api/src/model/track_dto.dart';
import 'package:kcp_api/src/model/update_child_dto.dart';
import 'package:kcp_api/src/model/video_dto.dart';
import 'package:kcp_api/src/model/week_dto.dart';

final _regList = RegExp(r'^List<(.*)>$');
final _regSet = RegExp(r'^Set<(.*)>$');
final _regMap = RegExp(r'^Map<String,(.*)>$');

ReturnType deserialize<ReturnType, BaseType>(
  dynamic value,
  String targetType, {
  bool growable = true,
}) {
  switch (targetType) {
    case 'String':
      return '$value' as ReturnType;
    case 'int':
      return (value is int ? value : int.parse('$value')) as ReturnType;
    case 'bool':
      if (value is bool) {
        return value as ReturnType;
      }
      final valueString = '$value'.toLowerCase();
      return (valueString == 'true' || valueString == '1') as ReturnType;
    case 'double':
      return (value is double ? value : double.parse('$value')) as ReturnType;
    case 'BadgeCountsDto':
      return BadgeCountsDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'BadgeDto':
      return BadgeDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'BadgesDto':
      return BadgesDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'BillingDto':
      return BillingDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'BoardWeekDto':
      return BoardWeekDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'CertificateDto':
      return CertificateDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'CertificateListDto':
      return CertificateListDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'ChallengeDto':
      return ChallengeDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'ChildCertificatesDto':
      return ChildCertificatesDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'ChildConsentsDto':
      return ChildConsentsDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'ChildDto':
      return ChildDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'ChildPremiumDto':
      return ChildPremiumDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'CodeFilesDto':
      return CodeFilesDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'ConsentRecordDto':
      return ConsentRecordDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'CreateFeedbackDto':
      return CreateFeedbackDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'EmailPreferencesDto':
      return EmailPreferencesDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'FeedbackCreatedDto':
      return FeedbackCreatedDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'InvoiceSummaryDto':
      return InvoiceSummaryDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'LanguageDto':
      return LanguageDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'LeaderboardDto':
      return LeaderboardDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'LeaderboardDtoMe':
      return LeaderboardDtoMe.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'LeaderboardEntryDto':
      return LeaderboardEntryDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'LearningOverviewDto':
      return LearningOverviewDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'LessonDto':
      return LessonDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'LessonProgressDto':
      return LessonProgressDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'LessonSummaryDto':
      return LessonSummaryDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'LevelDto':
      return LevelDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'LoginDto':
      return LoginDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'LoginResponseDto':
      return LoginResponseDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'MarkBadgesSeenDto':
      return MarkBadgesSeenDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'MarkReadDto':
      return MarkReadDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'MeDto':
      return MeDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'ModuleCertificateDto':
      return ModuleCertificateDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'ModuleDto':
      return ModuleDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'ModuleProjectDto':
      return ModuleProjectDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'NotificationDto':
      return NotificationDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'NotificationListDto':
      return NotificationListDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'PlanOptionDto':
      return PlanOptionDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'PracticeDto':
      return PracticeDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'PracticeProgressDto':
      return PracticeProgressDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'PracticeQuizDto':
      return PracticeQuizDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'PremiumInfoDto':
      return PremiumInfoDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'ProgressDto':
      return ProgressDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'QuizAnswerDto':
      return QuizAnswerDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'QuizDto':
      return QuizDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'QuizLineDto':
      return QuizLineDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'QuizOptionDto':
      return QuizOptionDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'QuizResultDto':
      return QuizResultDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'QuizRevealDto':
      return QuizRevealDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'RefreshDto':
      return RefreshDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'RegisterDeviceDto':
      return RegisterDeviceDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'RemoveDeviceDto':
      return RemoveDeviceDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'ReportCrashDto':
      return ReportCrashDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'RoleSummaryDto':
      return RoleSummaryDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'SeasonDto':
      return SeasonDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'StreakDto':
      return StreakDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'StudentLoginDto':
      return StudentLoginDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'StudentSummaryDto':
      return StudentSummaryDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'SubscriptionDto':
      return SubscriptionDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'TodayDto':
      return TodayDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'TrackDto':
      return TrackDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'UpdateChildDto':
      return UpdateChildDto.fromJson(value as Map<String, dynamic>)
          as ReturnType;
    case 'VideoDto':
      return VideoDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    case 'WeekDto':
      return WeekDto.fromJson(value as Map<String, dynamic>) as ReturnType;
    default:
      RegExpMatch? match;

      if (value is List && (match = _regList.firstMatch(targetType)) != null) {
        targetType = match![1]!; // ignore: parameter_assignments
        return value
                .map<BaseType>(
                  (dynamic v) => deserialize<BaseType, BaseType>(
                    v,
                    targetType,
                    growable: growable,
                  ),
                )
                .toList(growable: growable)
            as ReturnType;
      }
      if (value is Set && (match = _regSet.firstMatch(targetType)) != null) {
        targetType = match![1]!; // ignore: parameter_assignments
        return value
                .map<BaseType>(
                  (dynamic v) => deserialize<BaseType, BaseType>(
                    v,
                    targetType,
                    growable: growable,
                  ),
                )
                .toSet()
            as ReturnType;
      }
      if (value is Map && (match = _regMap.firstMatch(targetType)) != null) {
        targetType = match![1]!.trim(); // ignore: parameter_assignments
        return Map<String, BaseType>.fromIterables(
              value.keys as Iterable<String>,
              value.values.map(
                (dynamic v) => deserialize<BaseType, BaseType>(
                  v,
                  targetType,
                  growable: growable,
                ),
              ),
            )
            as ReturnType;
      }
      break;
  }
  throw Exception('Cannot deserialize');
}
