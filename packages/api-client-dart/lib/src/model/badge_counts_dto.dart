//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'badge_counts_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class BadgeCountsDto {
  /// Returns a new [BadgeCountsDto] instance.
  BadgeCountsDto({
    required this.earned,

    required this.total,

    required this.unseen,
  });

  @JsonKey(name: r'earned', required: true, includeIfNull: false)
  final num earned;

  @JsonKey(name: r'total', required: true, includeIfNull: false)
  final num total;

  /// Earned but not celebrated yet.
  @JsonKey(name: r'unseen', required: true, includeIfNull: false)
  final num unseen;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BadgeCountsDto &&
          other.earned == earned &&
          other.total == total &&
          other.unseen == unseen;

  @override
  int get hashCode => earned.hashCode + total.hashCode + unseen.hashCode;

  factory BadgeCountsDto.fromJson(Map<String, dynamic> json) =>
      _$BadgeCountsDtoFromJson(json);

  Map<String, dynamic> toJson() => _$BadgeCountsDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
