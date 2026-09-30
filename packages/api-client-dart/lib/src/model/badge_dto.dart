//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'badge_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class BadgeDto {
  /// Returns a new [BadgeDto] instance.
  BadgeDto({
    required this.key,

    required this.category,

    required this.icon,

    required this.earned,

    required this.awardedAt,

    required this.seen,
  });

  @JsonKey(name: r'key', required: true, includeIfNull: false)
  final String key;

  @JsonKey(name: r'category', required: true, includeIfNull: false)
  final String category;

  @JsonKey(name: r'icon', required: true, includeIfNull: false)
  final String icon;

  @JsonKey(name: r'earned', required: true, includeIfNull: false)
  final bool earned;

  @JsonKey(name: r'awardedAt', required: true, includeIfNull: true)
  final DateTime? awardedAt;

  /// False for badges earned but not celebrated yet.
  @JsonKey(name: r'seen', required: true, includeIfNull: false)
  final bool seen;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BadgeDto &&
          other.key == key &&
          other.category == category &&
          other.icon == icon &&
          other.earned == earned &&
          other.awardedAt == awardedAt &&
          other.seen == seen;

  @override
  int get hashCode =>
      key.hashCode +
      category.hashCode +
      icon.hashCode +
      earned.hashCode +
      (awardedAt == null ? 0 : awardedAt.hashCode) +
      seen.hashCode;

  factory BadgeDto.fromJson(Map<String, dynamic> json) =>
      _$BadgeDtoFromJson(json);

  Map<String, dynamic> toJson() => _$BadgeDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
