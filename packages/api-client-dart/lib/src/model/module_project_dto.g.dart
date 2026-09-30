// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'module_project_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ModuleProjectDtoCWProxy {
  ModuleProjectDto id(String id);

  ModuleProjectDto title(String title);

  ModuleProjectDto summary(String summary);

  ModuleProjectDto xp(num xp);

  ModuleProjectDto isPremium(bool isPremium);

  ModuleProjectDto locked(bool locked);

  ModuleProjectDto status(ModuleProjectDtoStatusEnum status);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ModuleProjectDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ModuleProjectDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ModuleProjectDto call({
    String id,
    String title,
    String summary,
    num xp,
    bool isPremium,
    bool locked,
    ModuleProjectDtoStatusEnum status,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfModuleProjectDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfModuleProjectDto.copyWith.fieldName(...)`
class _$ModuleProjectDtoCWProxyImpl implements _$ModuleProjectDtoCWProxy {
  const _$ModuleProjectDtoCWProxyImpl(this._value);

  final ModuleProjectDto _value;

  @override
  ModuleProjectDto id(String id) => this(id: id);

  @override
  ModuleProjectDto title(String title) => this(title: title);

  @override
  ModuleProjectDto summary(String summary) => this(summary: summary);

  @override
  ModuleProjectDto xp(num xp) => this(xp: xp);

  @override
  ModuleProjectDto isPremium(bool isPremium) => this(isPremium: isPremium);

  @override
  ModuleProjectDto locked(bool locked) => this(locked: locked);

  @override
  ModuleProjectDto status(ModuleProjectDtoStatusEnum status) =>
      this(status: status);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ModuleProjectDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ModuleProjectDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ModuleProjectDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? summary = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? isPremium = const $CopyWithPlaceholder(),
    Object? locked = const $CopyWithPlaceholder(),
    Object? status = const $CopyWithPlaceholder(),
  }) {
    return ModuleProjectDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      summary: summary == const $CopyWithPlaceholder()
          ? _value.summary
          // ignore: cast_nullable_to_non_nullable
          : summary as String,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      isPremium: isPremium == const $CopyWithPlaceholder()
          ? _value.isPremium
          // ignore: cast_nullable_to_non_nullable
          : isPremium as bool,
      locked: locked == const $CopyWithPlaceholder()
          ? _value.locked
          // ignore: cast_nullable_to_non_nullable
          : locked as bool,
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as ModuleProjectDtoStatusEnum,
    );
  }
}

extension $ModuleProjectDtoCopyWith on ModuleProjectDto {
  /// Returns a callable class that can be used as follows: `instanceOfModuleProjectDto.copyWith(...)` or like so:`instanceOfModuleProjectDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ModuleProjectDtoCWProxy get copyWith => _$ModuleProjectDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ModuleProjectDto _$ModuleProjectDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ModuleProjectDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'title',
          'summary',
          'xp',
          'isPremium',
          'locked',
          'status',
        ],
      );
      final val = ModuleProjectDto(
        id: $checkedConvert('id', (v) => v as String),
        title: $checkedConvert('title', (v) => v as String),
        summary: $checkedConvert('summary', (v) => v as String),
        xp: $checkedConvert('xp', (v) => v as num),
        isPremium: $checkedConvert('isPremium', (v) => v as bool),
        locked: $checkedConvert('locked', (v) => v as bool),
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$ModuleProjectDtoStatusEnumEnumMap,
            v,
            unknownValue: ModuleProjectDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ModuleProjectDtoToJson(ModuleProjectDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'summary': instance.summary,
      'xp': instance.xp,
      'isPremium': instance.isPremium,
      'locked': instance.locked,
      'status': _$ModuleProjectDtoStatusEnumEnumMap[instance.status]!,
    };

const _$ModuleProjectDtoStatusEnumEnumMap = {
  ModuleProjectDtoStatusEnum.NOT_STARTED: 'NOT_STARTED',
  ModuleProjectDtoStatusEnum.DRAFT: 'DRAFT',
  ModuleProjectDtoStatusEnum.SHIPPED: 'SHIPPED',
  ModuleProjectDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
