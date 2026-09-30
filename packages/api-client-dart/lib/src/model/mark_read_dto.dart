//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'mark_read_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class MarkReadDto {
  /// Returns a new [MarkReadDto] instance.
  MarkReadDto({this.ids, this.all});

  @JsonKey(name: r'ids', required: false, includeIfNull: false)
  final List<String>? ids;

  /// Marks every notification read.
  @JsonKey(name: r'all', required: false, includeIfNull: false)
  final bool? all;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkReadDto && other.ids == ids && other.all == all;

  @override
  int get hashCode => ids.hashCode + all.hashCode;

  factory MarkReadDto.fromJson(Map<String, dynamic> json) =>
      _$MarkReadDtoFromJson(json);

  Map<String, dynamic> toJson() => _$MarkReadDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
