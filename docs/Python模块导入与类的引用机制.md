# Python 的 import 与类的引用机制

本文以项目中的 [dashscope_provider.py](../backend/app/providers/dashscope_provider.py) 为例，讲解 Python 的模块导入、文件间引用，以及类内部的各种成员与方法。

## 1. 一行一行拆解 import

见 [dashscope_provider.py](../backend/app/providers/dashscope_provider.py#L3-L17)：

```python
import os                    # 整模块导入：使用时写 os.path.join(...)
import time                  # 整模块导入：time.sleep(2)
import uuid                  # 整模块导入：uuid.uuid4().hex
import urllib.request        # 导入 urllib 包里的子模块 request：urllib.request.urlretrieve(...)
from http import HTTPStatus  # 从 http 包导入单个名字：直接用 HTTPStatus.OK
from typing import Generator # 导入类型：用于函数返回值类型注解

import dashscope             # 第三方库整包导入
from dashscope import Generation, ImageSynthesis, MultiModalConversation  # 从包导入三个类

from .. import config        # 相对导入：上级包 app 的 config 模块
from .base import BaseProvider  # 相对导入：当前包 providers 里 base.py 的 BaseProvider 类

class DashScopeProvider(BaseProvider):  # 定义类，继承 BaseProvider
```

### 关键区分

`import X` 导入的是「模块/包」，`from X import Y` 导入的是「模块里的某个名字（函数/类/常量）」。

| 写法 | 后续使用 | 说明 |
|------|---------|------|
| `import os` | `os.path.join(...)` | 要带前缀 `os.` |
| `from os.path import join` | `join(...)` | 不带前缀，直接写 |
| `import urllib.request` | `urllib.request.urlretrieve(...)` | 导入的是 `request` 这个子模块，仍需带全路径 |

### 易错点

`import urllib` 不会自动把 `urllib.request` 加载进来 —— 子模块需要显式 `import urllib.request` 才能用，这是 Python 包的常见坑。

---

## 2. 模块、包，以及文件间如何相互引用

### 核心概念

- **模块** = 一个 `.py` 文件
- **包** = 一个含 `__init__.py` 的目录（`__init__.py` 可为空，作用是把这个目录标记为包）

### 本项目结构

```
backend/
  app/                      ← 包（有 __init__.py）
    __init__.py
    config.py               ← 模块 app.config
    providers/              ← 子包（有 __init__.py）
      __init__.py
      base.py               ← 模块 app.providers.base
      dashscope_provider.py ← 模块 app.providers.dashscope_provider
```

### 相对导入（本项目内部使用）

当前文件 `dashscope_provider.py` 位于 `app.providers` 包里，它引用其他文件：

```python
from .. import config            # .. → 上一级包 app；导入 app/config.py
from .base import BaseProvider   # .  → 当前包 providers；导入 providers/base.py 里的类
```

- `.` = 当前包（`app.providers`）
- `..` = 上一级包（`app`）
- `...` = 再上一级（一般不用）

所以 `from .. import config` 就是「去上级 `app` 目录，导入 `config` 模块」；`from .base import BaseProvider` 就是「去当前目录，从 `base.py` 导入 `BaseProvider` 类」。

### 项目里的真实例子

`routes.py`（在 `app.api` 包里）引用其他文件：

```python
from .. import config                          # → app/config.py
from ..database import SessionLocal             # → app/database.py 里的 SessionLocal
from ..models import GenerationRecord           # → app/models.py 里的类
from ..providers.dashscope_provider import DashScopeProvider  # → app/providers/dashscope_provider.py 里的类
from ..schemas import GenerateRequest           # → app/schemas.py 里的类
```

规律：**想引用哪个文件，就把「它相对当前位置的路径」转成点号写法**。

---

## 3. 类内部的各种成员

Python 类里有以下几种「方法/成员」，看 `DashScopeProvider` 和它的父类 `BaseProvider`。

### 抽象父类 base.py

```python
from abc import ABC, abstractmethod

class BaseProvider(ABC):                      # 继承 ABC 表示抽象类
    @abstractmethod                            # 抽象方法：子类必须实现
    def generate_text(self, prompt): ...
```

### 子类 dashscope_provider.py

```python
class DashScopeProvider(BaseProvider):
    TEXT_MODEL = "qwen-plus"                   # ① 类属性：所有实例共享，self.TEXT_MODEL 访问

    def __init__(self):                         # ② 构造方法：实例化时自动调用
        dashscope.api_key = config.DASHSCOPE_API_KEY

    def generate_text(self, prompt):            # ③ 实例方法：第一个参数是 self，指向实例本身
        ...

    @staticmethod                                # ④ 静态方法：不需要 self，也不访问实例
    def _extract_vl_text(content): ...
```

### 各类成员的区别

| 类型 | 定义特征 | 第一个参数 | 访问方式 | 本项目作用 |
|------|---------|-----------|---------|-----------|
| 类属性 | 定义在类体里、方法外 | 无 | `self.TEXT_MODEL` 或 `DashScopeProvider.TEXT_MODEL` | 存放三个模型名常量 |
| 构造方法 `__init__` | 特殊方法名 | `self` | 实例化时自动执行 | 设置 API Key |
| 实例方法 | 普通 `def` | `self`（实例本身） | `obj.method(...)` | `generate_text` / `text_to_image` / `image_to_text` |
| 静态方法 `@staticmethod` | 加装饰器 | 无 `self` | `类名.method(...)` | `_extract_vl_text` / `_download_image` |

### 实例方法 vs 静态方法（最关键的区别）

```python
def generate_text(self, prompt):   # 实例方法：能用 self 访问实例（如 self.TEXT_MODEL）
    ... self.TEXT_MODEL ...

@staticmethod
def _extract_vl_text(content):     # 静态方法：没有 self，不能碰实例属性，纯粹输入→输出
    return ...
```

- **实例方法**需要操作「这个具体实例」的数据（这里用 `self.TEXT_MODEL` 拿到模型名），所以必须有 `self`。
- **静态方法**不需要任何实例状态，只是逻辑上「属于这个类的工具函数」，加 `@staticmethod` 后不用传 `self`，也不会误用实例。

### 继承与抽象

`class DashScopeProvider(BaseProvider)` 表示 `DashScopeProvider` **继承** `BaseProvider`：

- 父类 `BaseProvider` 用 `@abstractmethod` 声明三个「必须实现」的方法签名（只有接口没有实现）。
- 子类 `DashScopeProvider` 实现了这三个方法，所以能被实例化使用。
- 好处：业务层（`generation_service.py`）只依赖 `BaseProvider` 这个抽象类型，将来换模型只需再写一个子类，业务层代码一行不改 —— 这就是本项目「模型适配层」的设计意图。

---

## 4. 调用关系整体串起来

```
routes.py 里 provider = DashScopeProvider()   → 触发 __init__ 设置 key
        ↓
generation_service._run_text(...)
        ↓ self._provider.generate_text(prompt)
dashscope_provider.generate_text()            → 实例方法，内部用 self.TEXT_MODEL
        ↓ yield 文本片段
业务层逐段推 SSE
```