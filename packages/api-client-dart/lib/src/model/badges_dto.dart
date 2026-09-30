//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/badge_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'badges_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class BadgesDto {
  /// Returns a new [BadgesDto] instance.
  BadgesDto({required this.badges});

  @JsonKey(name: r'badges', required: true, includeIfNull: false)
  final List<BadgeDto> badges;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is BadgesDto && other.badges == badges;

  @override
  int get hashCode => badges.hashCode;

  factory BadgesDto.fromJson(Map<String, dynamic> json) =>
      _$BadgesDtoFromJson(json);

  Map<String, dynamic> toJson() => _$BadgesDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
