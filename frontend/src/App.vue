<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { TextStreamChatTransport } from "ai";
import { Chat } from "@ai-sdk/vue";

// 1. 本地管理輸入框的狀態
const input = ref("");

// 2. 初始化 Chat 實例
const chat = new Chat({
   transport: new TextStreamChatTransport({
      api: "https://ai-todolist.onrender.com/api/chat",
   }),
});

const isLoading = computed(
   () => chat.status === "submitted" || chat.status === "streaming",
);

// 3. 處理表單提交，使用 chat.sendMessage
const submitForm = () => {
   if (!input.value.trim()) return;

   // 發送訊息
   chat.sendMessage({ text: input.value });

   // 清空輸入框
   input.value = "";
};

// 4. 解析新版訊息格式的輔助函數 (從 m.parts 中提取純文字)
const getMessageText = (m) => {
   if (m.parts) {
      return m.parts
         .filter((part) => part.type === "text")
         .map((part) => part.text)
         .join("");
   }
   // m.parts output example
   // - 多飲水
   // - 多做運動
   return m.content || ""; // 兼容備用
};

// --- Todo Logic ---
const todos = ref([]);

onMounted(() => {
   const saved = localStorage.getItem("ai-todos");
   if (saved) todos.value = JSON.parse(saved);
});

watch(
   todos,
   (newValue) => {
      localStorage.setItem("ai-todos", JSON.stringify(newValue));
   },
   { deep: true },
);

const addTodosFromMessage = (text) => {
   const items = text
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

   items.forEach((item, index) => {
      todos.value.push({ id: Date.now() + index, text: item, done: false });
   });
};

const removeTodo = (id) => {
   todos.value = todos.value.filter((t) => t.id !== id);
};

// 5. 自訂重新生成 (Regenerate) 邏輯
const regenerate = () => {
  const messages = chat.messages;
  
  // 確保對話紀錄至少有兩條 (一條 User，一條 AI) 先可以 Regenerate
  if (messages.length < 2) return;

  // 攞返對上一條 response 嘅內容
  const lastUserMessage = messages[messages.length - 2];
  const previousText = getMessageText(lastUserMessage);

  // 剷走陣列最後兩條對話 (即係清走舊嘅 User 問題 + AI 答得唔好嘅回覆)
  // 咁樣下一次 Send 嗰陣，API 就唔會讀到錯誤嘅歷史紀錄
  chat.messages.splice(messages.length - 2, 2);

  // 系統自動幫你再發送一次問題
  chat.sendMessage({ text: previousText });
};
</script>

<template>
   <main class="app-container">
      <h1 class="title">AI - TODO LIST</h1>

      <section class="ai-section">
         <form @submit.prevent="submitForm" class="input-form">
            <input v-model="input" placeholder="想做咩(例如：練習英文)" />
            <button type="submit" :disabled="isLoading">
               {{ isLoading ? "Thinking..." : "Ask" }}
            </button>
         </form>

         <p v-if="chat.error" class="error-message">
            AI 暫時未能回覆，請稍後再試。
         </p>

         <div
            v-for="(m, index) in chat.messages"
            :key="m.id || index"
            class="message"
            :class="m.role"
         >
            <p>{{ getMessageText(m) }}</p>

            <div
               class="action-buttons"
               v-if="m.role === 'assistant' && !isLoading && getMessageText(m)"
            >
               <button
                  v-if="
                     m.role === 'assistant' && !isLoading && getMessageText(m)
                  "
                  @click="addTodosFromMessage(getMessageText(m))"
                  class="add-btn"
               >
                  add in the List! ⬇️
               </button>

               <!-- 新增嘅 Regenerate 按鈕 (只喺最後一條訊息顯示) -->
               <button
                  v-if="index === chat.messages.length - 1"
                  class="reload-btn"
                  @click="regenerate"
               >
                  Regenerate 🔄
               </button>
            </div>
         </div>
      </section>

      <section class="todo-section">
         <h2>My mission</h2>
         <ul v-if="todos.length > 0">
            <li
               v-for="todo in todos"
               :key="todo.id"
               :class="{ done: todo.done }"
            >
               <label>
                  <input type="checkbox" v-model="todo.done" />
                  <span>{{ todo.text }}</span>
               </label>
               <button @click="removeTodo(todo.id)" class="del-btn">❌</button>
            </li>
         </ul>
         <p v-else class="empty">No any tasks, call the AI</p>
      </section>
   </main>
</template>

<style scoped lang="scss">
// SCSS 變數，方便統一改顏色
$primary-color: #646cff;
$bg-color: #f8f9fa;
$radius: 12px;
.app-container {
   max-width: 500px;
   margin: 2rem auto;
   font-family: sans-serif;
   color: #333;

   .title {
      text-align: center;
      color: $primary-color;
   }

   .ai-section,
   .todo-section {
      background: $bg-color;
      padding: 1.5rem;
      border-radius: $radius;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
   }

   .input-form {
      display: flex;
      gap: 0.5rem;

      input {
         flex: 1;
         padding: 0.6rem;
         border: 1px solid #ddd;
         border-radius: 6px;
         outline: none;
         &:focus {
            border-color: $primary-color;
         }
      }

      button {
         background: $primary-color;
         color: white;
         border: none;
         padding: 0 1rem;
         border-radius: 6px;
         cursor: pointer;
         font-weight: bold;
         &:disabled {
            background: #ccc;
            cursor: not-allowed;
         }
      }
   }

   .message {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      white-space: pre-wrap;
      line-height: 1.5;

      &.user {
         background: #e3f2fd;
         border-left: 4px solid #2196f3;
      }

      &.assistant {
         background: white;
         border: 1px solid #eee;
      }

      .action-buttons {
         display: flex;
         gap: 10px; // 兩個按鈕之間嘅距離
         margin-top: 8px;
         .add-btn {
            background: #4caf50;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            &:hover {
               background: #45a049;
            }
         }

         .reload-btn {
            background: #ff9800; // 橙色，表示重新載入/警告
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            &:hover {
               background: #e68a00;
            }
         }
      }
   }

   .error-message {
      margin: 0.8rem 0 0;
      color: #b00020;
      font-size: 0.9rem;
   }

   .todo-section {
      ul {
         list-style: none;
         padding: 0;

         li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.8rem 0;
            border-bottom: 1px solid #eee;

            &.done span {
               text-decoration: line-through;
               color: #aaa;
            }

            label {
               display: flex;
               align-items: center;
               gap: 0.5rem;
               cursor: pointer;
            }

            .del-btn {
               background: none;
               border: none;
               cursor: pointer;
               opacity: 0.5;
               &:hover {
                  opacity: 1;
               }
            }
         }
      }

      .empty {
         text-align: center;
         color: #888;
         font-size: 0.9rem;
      }
   }
}
</style>