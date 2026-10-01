//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'review_summary_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ReviewSummaryDto {
  /// Returns a new [ReviewSummaryDto] instance.
  ReviewSummaryDto({
    required this.id,

    required this.status,

    required this.version,

    required this.requestedAt,

    required this.decidedAt,

    required this.seen,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ReviewSummaryDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ReviewSummaryDtoStatusEnum status;

  @JsonKey(name: r'version', required: true, includeIfNull: false)
  final num version;

  @JsonKey(name: r'requestedAt', required: true, includeIfNull: false)
  final DateTime requestedAt;

  @JsonKey(name: r'decidedAt', required: true, includeIfNull: true)
  final DateTime? decidedAt;

  /// The student opened the result.
  @JsonKey(name: r'seen', required: true, includeIfNull: false)
  final bool seen;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReviewSummaryDto &&
          other.id == id &&
          other.status == status &&
          other.version == version &&
          other.requestedAt == requestedAt &&
          other.decidedAt == decidedAt &&
          other.seen == seen;

  @override
  int get hashCode =>
      id.hashCode +
      status.hashCode +
      version.hashCode +
      requestedAt.hashCode +
      (decidedAt == null ? 0 : decidedAt.hashCode) +
      seen.hashCode;

  factory ReviewSummaryDto.fromJson(Map<String, dynamic> json) =>
      _$ReviewSummaryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ReviewSummaryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ReviewSummaryDtoStatusEnum {
  @JsonValue(r'WAITING')
  WAITING(r'WAITING'),
  @JsonValue(r'IN_REVIEW')
  IN_REVIEW(r'IN_REVIEW'),
  @JsonValue(r'APPROVED')
  APPROVED(r'APPROVED'),
  @JsonValue(r'CHANGES_REQUESTED')
  CHANGES_REQUESTED(r'CHANGES_REQUESTED'),
  @JsonValue(r'CANCELLED')
  CANCELLED(r'CANCELLED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ReviewSummaryDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
