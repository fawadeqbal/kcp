//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_approval_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentApprovalDto {
  /// Returns a new [ParentApprovalDto] instance.
  ParentApprovalDto({
    required this.status,

    required this.memberId,

    required this.projectId,

    required this.title,

    required this.summary,

    required this.leadName,

    required this.note,

    required this.taskTitle,

    required this.estimateMinutes,

    required this.estimatedEarningsMinor,

    required this.currency,

    required this.invitedAt,

    required this.childId,

    required this.nickname,

    required this.shareBp,

    required this.studentPercent,
  });

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ParentApprovalDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ParentApprovalDtoStatusEnum status;

  @JsonKey(name: r'memberId', required: true, includeIfNull: false)
  final String memberId;

  @JsonKey(name: r'projectId', required: true, includeIfNull: false)
  final String projectId;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  @JsonKey(name: r'summary', required: true, includeIfNull: false)
  final String summary;

  @JsonKey(name: r'leadName', required: true, includeIfNull: true)
  final String? leadName;

  @JsonKey(name: r'note', required: true, includeIfNull: true)
  final String? note;

  @JsonKey(name: r'taskTitle', required: true, includeIfNull: true)
  final String? taskTitle;

  @JsonKey(name: r'estimateMinutes', required: true, includeIfNull: true)
  final num? estimateMinutes;

  /// About what the student earns for the task (minor units), if they finish it.
  @JsonKey(name: r'estimatedEarningsMinor', required: true, includeIfNull: true)
  final num? estimatedEarningsMinor;

  @JsonKey(name: r'currency', required: true, includeIfNull: false)
  final String currency;

  @JsonKey(name: r'invitedAt', required: true, includeIfNull: false)
  final DateTime invitedAt;

  @JsonKey(name: r'childId', required: true, includeIfNull: false)
  final String childId;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  /// The share of the students' pool the task carries (basis points).
  @JsonKey(name: r'shareBp', required: true, includeIfNull: true)
  final num? shareBp;

  @JsonKey(name: r'studentPercent', required: true, includeIfNull: false)
  final num studentPercent;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentApprovalDto &&
          other.status == status &&
          other.memberId == memberId &&
          other.projectId == projectId &&
          other.title == title &&
          other.summary == summary &&
          other.leadName == leadName &&
          other.note == note &&
          other.taskTitle == taskTitle &&
          other.estimateMinutes == estimateMinutes &&
          other.estimatedEarningsMinor == estimatedEarningsMinor &&
          other.currency == currency &&
          other.invitedAt == invitedAt &&
          other.childId == childId &&
          other.nickname == nickname &&
          other.shareBp == shareBp &&
          other.studentPercent == studentPercent;

  @override
  int get hashCode =>
      status.hashCode +
      memberId.hashCode +
      projectId.hashCode +
      title.hashCode +
      summary.hashCode +
      (leadName == null ? 0 : leadName.hashCode) +
      (note == null ? 0 : note.hashCode) +
      (taskTitle == null ? 0 : taskTitle.hashCode) +
      (estimateMinutes == null ? 0 : estimateMinutes.hashCode) +
      (estimatedEarningsMinor == null ? 0 : estimatedEarningsMinor.hashCode) +
      currency.hashCode +
      invitedAt.hashCode +
      childId.hashCode +
      nickname.hashCode +
      (shareBp == null ? 0 : shareBp.hashCode) +
      studentPercent.hashCode;

  factory ParentApprovalDto.fromJson(Map<String, dynamic> json) =>
      _$ParentApprovalDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentApprovalDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ParentApprovalDtoStatusEnum {
  @JsonValue(r'INVITED')
  INVITED(r'INVITED'),
  @JsonValue(r'ACCEPTED')
  ACCEPTED(r'ACCEPTED'),
  @JsonValue(r'APPROVED')
  APPROVED(r'APPROVED'),
  @JsonValue(r'DECLINED')
  DECLINED(r'DECLINED'),
  @JsonValue(r'REMOVED')
  REMOVED(r'REMOVED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ParentApprovalDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
