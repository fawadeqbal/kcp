// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mark_read_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$MarkReadDtoCWProxy {
  MarkReadDto ids(List<String>? ids);

  MarkReadDto all(bool? all);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `MarkReadDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// MarkReadDto(...).copyWith(id: 12, name: "My name")
  /// ````
  MarkReadDto call({List<String>? ids, bool? all});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfMarkReadDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfMarkReadDto.copyWith.fieldName(...)`
class _$MarkReadDtoCWProxyImpl implements _$MarkReadDtoCWProxy {
  const _$MarkReadDtoCWProxyImpl(this._value);

  final MarkReadDto _value;

  @override
  MarkReadDto ids(List<String>? ids) => this(ids: ids);

  @override
  MarkReadDto all(bool? all) => this(all: all);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `MarkReadDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// MarkReadDto(...).copyWith(id: 12, name: "My name")
  /// ````
  MarkReadDto call({
    Object? ids = const $CopyWithPlaceholder(),
    Object? all = const $CopyWithPlaceholder(),
  }) {
    return MarkReadDto(
      ids: ids == const $CopyWithPlaceholder()
          ? _value.ids
          // ignore: cast_nullable_to_non_nullable
          : ids as List<String>?,
      all: all == const $CopyWithPlaceholder()
          ? _value.all
          // ignore: cast_nullable_to_non_nullable
          : all as bool?,
    );
  }
}

extension $MarkReadDtoCopyWith on MarkReadDto {
  /// Returns a callable class that can be used as follows: `instanceOfMarkReadDto.copyWith(...)` or like so:`instanceOfMarkReadDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$MarkReadDtoCWProxy get copyWith => _$MarkReadDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MarkReadDto _$MarkReadDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('MarkReadDto', json, ($checkedConvert) {
      final val = MarkReadDto(
        ids: $checkedConvert(
          'ids',
          (v) => (v as List<dynamic>?)?.map((e) => e as String).toList(),
        ),
        all: $checkedConvert('all', (v) => v as bool?),
      );
      return val;
    });

Map<String, dynamic> _$MarkReadDtoToJson(MarkReadDto instance) =>
    <String, dynamic>{'ids': ?instance.ids, 'all': ?instance.all};
